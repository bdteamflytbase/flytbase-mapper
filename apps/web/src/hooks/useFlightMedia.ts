import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '../lib/api';

export function useFlightMedia(flightId: string | undefined) {
  return useQuery({
    queryKey: ['flight-media', flightId],
    queryFn: () => mediaApi.getByFlight(flightId!),
    enabled: !!flightId,
    staleTime: 60_000,
  });
}
