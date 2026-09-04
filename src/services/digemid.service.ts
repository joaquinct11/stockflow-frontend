import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface CatalogoDigemidDTO {
  id: number;
  codProd: string;
  nomProd: string;
  concent: string | null;
  nomFormFarm: string | null;
  presentac: string | null;
  fraccion: number | null;
  numRegSan: string | null;
  nomTitular: string | null;
  nomIfa: string | null;
  nomRubro: string | null;
  situacion: string | null;
}

export interface ProductoDigemidDTO {
  id: number;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  registroSanitario: string;
  codDigemid: string;
  nomDigemid: string;
  fraccion: number;
  vinculado: boolean;
}

export const digemidService = {
  buscarCatalogo: async (q: string): Promise<CatalogoDigemidDTO[]> => {
    const { data } = await axiosInstance.get<CatalogoDigemidDTO[]>(
      API_ENDPOINTS.DIGEMID.CATALOGO_BUSCAR(q)
    );
    return data;
  },

  listarProductos: async (): Promise<ProductoDigemidDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDigemidDTO[]>(
      API_ENDPOINTS.DIGEMID.PRODUCTOS
    );
    return data;
  },

  vincular: async (productoId: number, codDigemid: string): Promise<void> => {
    await axiosInstance.patch(API_ENDPOINTS.DIGEMID.VINCULAR(productoId), { codDigemid });
  },

  desvincular: async (productoId: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.DIGEMID.DESVINCULAR(productoId));
  },

  exportarOppf: async (
    codEstablecimiento: string,
    ruc: string,
    mes: string,
    ano: string,
    tipo: string = 'CARGA ARCHIVO'
  ): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(
      API_ENDPOINTS.DIGEMID.OPPF_EXPORTAR(codEstablecimiento, ruc, mes, ano, tipo),
      { responseType: 'blob' }
    );
    return data;
  },
};
