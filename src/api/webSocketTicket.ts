import axiosInstance from './axiosInstance';

interface TicketResponse {
  ticket: string;
  expiresInSeconds: number;
}

export const issueWebSocketTicket = async (): Promise<string> => {
  const response = await axiosInstance.post('/auth/ws-ticket');
  const data = response.data?.data as TicketResponse | undefined;
  if (!data?.ticket) throw new Error('WebSocket ticket was not issued.');
  return data.ticket;
};
