'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinSale = (saleId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_sale', { saleId });
    }
  };

  const leaveSale = (saleId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_sale', { saleId });
    }
  };

  const joinAdmin = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_admin_dashboard');
    }
  };

  const onPaymentUpdate = (callback: (data: any) => void) => {
    socketRef.current?.on('payment_updated', callback);
    socketRef.current?.on('global_payment_updated', callback);

    return () => {
      socketRef.current?.off('payment_updated', callback);
      socketRef.current?.off('global_payment_updated', callback);
    };
  };

  const onDashboardUpdate = (callback: (data: any) => void) => {
    socketRef.current?.on('dashboard_stats_updated', callback);

    return () => {
      socketRef.current?.off('dashboard_stats_updated', callback);
    };
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinSale,
    leaveSale,
    joinAdmin,
    onPaymentUpdate,
    onDashboardUpdate,
  };
}
