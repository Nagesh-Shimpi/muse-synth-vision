import { useEffect, useState, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import {
  getPiano,
  getGuitar,
  getViolin,
  getFlute,
  getSitar,
  getVeena,
  triggerDrum,
  setSuppressEvent
} from "@/lib/audio-engine";

export type RoomUser = {
  id: string;
  name: string;
  instrumentType: string;
};

export function useMultiplayer(roomId: string | null, userName: string, defaultInstrument: string) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit("join_room", { 
        roomId, 
        user: { name: userName, instrumentType: defaultInstrument } 
      });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onRoomState = (roomUsers: RoomUser[]) => {
      setUsers(roomUsers);
    };

    const onRemotePlayNote = ({ instrumentType, note, velocity }: any) => {
      try {
        setSuppressEvent(true);
        switch (instrumentType.toLowerCase()) {
          case "piano": getPiano().triggerAttackRelease(note, "8n"); break;
          case "guitar": getGuitar().triggerAttackRelease(note, "4n"); break;
          case "violin": getViolin().triggerAttackRelease(note, "4n"); break;
          case "flute": getFlute().triggerAttackRelease(note, "4n"); break;
          case "sitar": getSitar().triggerAttackRelease(note, "2n"); break;
          case "veena": getVeena().triggerAttackRelease(note, "2n"); break;
          case "drums": triggerDrum(note as any); break;
        }
      } catch (e) {
        console.error("Remote play note failed", e);
      } finally {
        setSuppressEvent(false);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_state", onRoomState);
    socket.on("remote_play_note", onRemotePlayNote);

    if (socket.connected) {
      onConnect();
    }

    const handleLocalNote = (e: CustomEvent) => {
      if (socket.connected) {
        const { instrumentType, note } = e.detail;
        socket.emit("play_note", { roomId, instrumentType, note, velocity: 1 });
      }
    };

    window.addEventListener("local_note_played", handleLocalNote as EventListener);

    return () => {
      window.removeEventListener("local_note_played", handleLocalNote as EventListener);
      socket.emit("leave_room", { roomId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_state", onRoomState);
      socket.off("remote_play_note", onRemotePlayNote);
    };
  }, [roomId, userName, defaultInstrument]);

  const updateInstrument = useCallback((instrumentType: string) => {
    if (roomId && connected) {
      const socket = getSocket();
      socket.emit("update_instrument", { roomId, instrumentType });
    }
  }, [roomId, connected]);

  return {
    users,
    connected,
    updateInstrument
  };
}
