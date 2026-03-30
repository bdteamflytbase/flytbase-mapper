import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../lib/api';
import { useMemo } from 'react';

export function useFlightOutputs(projectId: string | undefined, jobIds: string[] | undefined) {
  const { data: allOutputs = [], ...rest } = useQuery({
    queryKey: ['project-outputs', projectId],
    queryFn: () => projectsApi.getOutputs(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const outputs = useMemo(() => {
    if (!jobIds || jobIds.length === 0) return allOutputs;
    const jobSet = new Set(jobIds);
    return allOutputs.filter((o: any) => jobSet.has(o.job_id));
  }, [allOutputs, jobIds]);

  return { data: outputs, ...rest };
}
