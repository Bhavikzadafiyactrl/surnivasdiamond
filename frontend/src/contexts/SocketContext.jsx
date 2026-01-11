import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io({
      path: "/socket.io",
      transports: ["websocket"],
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected", socketInstance.id);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

    setSocket(socketInstance);

    return () => socketInstance.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
