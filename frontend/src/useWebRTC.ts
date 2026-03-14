import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from './api';

export function useWebRTC(roomCode: string, playerId: string | null, isActive: boolean) {
  const [micActive, setMicActive] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // Initialize WebRTC and WebSocket when isActive becomes true
  useEffect(() => {
    if (!roomCode || !playerId || !isActive) {
      cleanup();
      return;
    }

    let isComponentMounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!isComponentMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        
        // Apply initial mic state
        stream.getAudioTracks().forEach(track => {
            track.enabled = micActive;
        });

        // Initialize WebSocket
        const wsUrl = WS_URL;
        const ws = new WebSocket(`${wsUrl}/game/${roomCode}/ws/${playerId}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected for WebRTC");
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          const { type, sender, sdp, candidate } = msg;

          if (sender === playerId) return; 

          if (type === 'peer-joined') {
            await createAndSendOffer(sender);
          } else if (type === 'peer-left') {
            removePeer(sender);
          } else if (type === 'offer') {
            await handleOffer(sender, sdp);
          } else if (type === 'answer') {
            await handleAnswer(sender, sdp);
          } else if (type === 'candidate') {
            await handleCandidate(sender, candidate);
          }
        };

      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }

    init();

    return () => {
      isComponentMounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerId, isActive]);

  // Handle mic toggle
  useEffect(() => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = micActive;
        });
    }
  }, [micActive]);

  const toggleMic = useCallback(() => {
      setMicActive(prev => !prev);
  }, []);

  function createPeerConnection(targetId: string): RTCPeerConnection {
    // Basic STUN configuration - Add multiple STUN servers for better reliability over internet
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    peersRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'candidate',
          target: targetId,
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote track from ${targetId}`);
      setRemoteStreams(prev => ({
        ...prev,
        [targetId]: event.streams[0]
      }));
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State with ${targetId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Don't remove immediately on disconnected as it might reconnect
        if (pc.iceConnectionState === 'failed') {
            removePeer(targetId);
        }
      }
    };

    return pc;
  }

  async function createAndSendOffer(targetId: string) {
    const pc = createPeerConnection(targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        target: targetId,
        sdp: offer
      }));
    }
  }

  async function handleOffer(senderId: string, offer: RTCSessionDescriptionInit) {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Process any queued candidates for this peer
    processQueuedCandidates(senderId);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        target: senderId,
        sdp: answer
      }));
    }
  }

  async function handleAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
    const pc = peersRef.current[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      processQueuedCandidates(senderId);
    }
  }

  async function handleCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = peersRef.current[senderId];
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.warn("Error adding ICE candidate:", err);
      });
    } else {
      // Queue candidate if remote description is not set yet
      if (!pendingCandidates.current[senderId]) {
        pendingCandidates.current[senderId] = [];
      }
      pendingCandidates.current[senderId].push(candidate);
    }
  }

  async function processQueuedCandidates(peerId: string) {
    const pc = peersRef.current[peerId];
    const candidates = pendingCandidates.current[peerId];
    if (pc && candidates) {
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
            console.warn("Error adding queued ICE candidate:", err);
        });
      }
      delete pendingCandidates.current[peerId];
    }
  }

  function removePeer(peerId: string) {
    if (peersRef.current[peerId]) {
      peersRef.current[peerId].close();
      delete peersRef.current[peerId];
    }
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
    delete pendingCandidates.current[peerId];
  }

  function cleanup() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    pendingCandidates.current = {};
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }

  return {
    micActive,
    toggleMic,
    remoteStreams
  };
}
