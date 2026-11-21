import React, { useEffect, useState } from 'react';
import { ubigeoService } from '../../services/ubigeo.service';
import type { UbigeoDistrito } from '../../services/ubigeo.service';

interface UbigeoSelectorProps {
  value?: string;
  onChange: (codigo: string) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export const UbigeoSelector: React.FC<UbigeoSelectorProps> = ({
  value,
  onChange,
  label,
  disabled,
  error,
}) => {
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<UbigeoDistrito[]>([]);

  const [selDep, setSelDep] = useState('');
  const [selProv, setSelProv] = useState('');
  const [selDist, setSelDist] = useState('');

  const [loading, setLoading] = useState(false);

  // Cargar departamentos al montar
  useEffect(() => {
    ubigeoService.getDepartamentos().then(setDepartamentos).catch(() => {});
  }, []);

  // Si viene un value inicial, precarga la selección
  useEffect(() => {
    if (!value || value.length !== 6 || departamentos.length === 0) return;
    ubigeoService.getByCodigo(value).then(ubigeo => {
      if (!ubigeo) return;
      setSelDep(ubigeo.departamento);
      ubigeoService.getProvincias(ubigeo.departamento).then(provs => {
        setProvincias(provs);
        setSelProv(ubigeo.provincia);
        ubigeoService.getDistritos(ubigeo.departamento, ubigeo.provincia).then(dists => {
          setDistritos(dists);
          setSelDist(ubigeo.codigo);
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, departamentos]);

  const handleDep = async (dep: string) => {
    setSelDep(dep);
    setSelProv('');
    setSelDist('');
    setProvincias([]);
    setDistritos([]);
    if (!dep) return;
    setLoading(true);
    try {
      const provs = await ubigeoService.getProvincias(dep);
      setProvincias(provs);
    } finally {
      setLoading(false);
    }
  };

  const handleProv = async (prov: string) => {
    setSelProv(prov);
    setSelDist('');
    setDistritos([]);
    if (!prov) return;
    setLoading(true);
    try {
      const dists = await ubigeoService.getDistritos(selDep, prov);
      setDistritos(dists);
    } finally {
      setLoading(false);
    }
  };

  const handleDist = (codigo: string) => {
    setSelDist(codigo);
    onChange(codigo);
  };

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <select
        className={selectClass}
        value={selDep}
        onChange={e => handleDep(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">— Departamento —</option>
        {departamentos.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selProv}
        onChange={e => handleProv(e.target.value)}
        disabled={disabled || loading || !selDep}
      >
        <option value="">— Provincia —</option>
        {provincias.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selDist}
        onChange={e => handleDist(e.target.value)}
        disabled={disabled || loading || !selProv}
      >
        <option value="">— Distrito —</option>
        {distritos.map(d => (
          <option key={d.codigo} value={d.codigo}>{d.distrito} ({d.codigo})</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
