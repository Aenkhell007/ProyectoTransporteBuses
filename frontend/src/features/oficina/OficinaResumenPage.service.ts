import { http } from '../../services/http';
import type { OficinaResumenResponse } from './OficinaResumenPage.types';
export const fetchOficinaResumenData=()=>http<OficinaResumenResponse>('/oficina/resumen');
