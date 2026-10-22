"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, FileSpreadsheet, X, Check, AlertCircle, ArrowRight, 
  Trash2, RefreshCw, Eye, CheckCircle2 
} from "lucide-react";
import * as XLSX from "xlsx";
import { ProvisioningCatalogItem } from "@/core/provisioning/ProvisioningEngine";

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'product' | 'service';
  onImportSuccess: (items: ProvisioningCatalogItem[]) => void;
}

export default function CatalogImportModal({
  isOpen,
  onClose,
  defaultType = 'product',
  onImportSuccess
}: CatalogImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [itemType, setItemType] = useState<'product' | 'service'>(defaultType);

  // Mapeo de columnas
  const [mappings, setMappings] = useState({
    name: "",
    category: "",
    price: "",
    durationOrStock: "",
    description: "",
    imageUrl: ""
  });

  const [validationResult, setValidationResult] = useState<{
    validItems: ProvisioningCatalogItem[];
    errorsCount: number;
    warningsCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const processFile = async (fileToRead: File) => {
    setFile(fileToRead);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (!data || data.length === 0) {
          alert("El archivo está vacío");
          return;
        }

        const headers = (data[0] || []).map((h) => String(h || "").trim());
        const rows = data.slice(1).filter((r) => r.some((cell) => cell !== null && cell !== undefined && cell !== ""));

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto-mapeo inteligente por similitud de nombres
        const autoMap = {
          name: "",
          category: "",
          price: "",
          durationOrStock: "",
          description: "",
          imageUrl: ""
        };

        headers.forEach((h) => {
          const lower = h.toLowerCase();
          if (lower.includes("nom") || lower.includes("prod") || lower.includes("serv") || lower.includes("item") || lower.includes("titulo")) {
            if (!autoMap.name) autoMap.name = h;
          } else if (lower.includes("cat") || lower.includes("secc") || lower.includes("grupo")) {
            if (!autoMap.category) autoMap.category = h;
          } else if (lower.includes("prec") || lower.includes("val") || lower.includes("tarifa") || lower.includes("cost")) {
            if (!autoMap.price) autoMap.price = h;
          } else if (lower.includes("stock") || lower.includes("cant") || lower.includes("dur") || lower.includes("min")) {
            if (!autoMap.durationOrStock) autoMap.durationOrStock = h;
          } else if (lower.includes("desc") || lower.includes("detall")) {
            if (!autoMap.description) autoMap.description = h;
          } else if (lower.includes("img") || lower.includes("foto") || lower.includes("imagen") || lower.includes("url")) {
            if (!autoMap.imageUrl) autoMap.imageUrl = h;
          }
        });

        setMappings(autoMap);
      } catch (err: any) {
        console.error("Error al leer archivo:", err);
        alert("Error al leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.");
      }
    };
    reader.readAsBinaryString(fileToRead);
  };

  const handleValidateAndPreview = () => {
    if (!mappings.name) {
      alert("Debes seleccionar la columna correspondiente al Nombre del producto o servicio.");
      return;
    }

    const nameIdx = rawHeaders.indexOf(mappings.name);
    const catIdx = mappings.category ? rawHeaders.indexOf(mappings.category) : -1;
    const priceIdx = mappings.price ? rawHeaders.indexOf(mappings.price) : -1;
    const extraIdx = mappings.durationOrStock ? rawHeaders.indexOf(mappings.durationOrStock) : -1;
    const descIdx = mappings.description ? rawHeaders.indexOf(mappings.description) : -1;
    const imgIdx = mappings.imageUrl ? rawHeaders.indexOf(mappings.imageUrl) : -1;

    let valid: ProvisioningCatalogItem[] = [];
    let errors = 0;
    let warnings = 0;

    rawRows.forEach((row) => {
      const name = String(row[nameIdx] || "").trim();
      if (!name) {
        errors++;
        return;
      }

      let price = 0;
      if (priceIdx >= 0) {
        const rawP = String(row[priceIdx] || "").replace(/[^0-9.,]/g, "").replace(",", ".");
        price = parseFloat(rawP) || 0;
        if (price <= 0) warnings++;
      }

      let durationOrStock = 0;
      if (extraIdx >= 0) {
        const rawExtra = String(row[extraIdx] || "").replace(/[^0-9]/g, "");
        durationOrStock = parseInt(rawExtra) || (itemType === 'service' ? 45 : 10);
      } else {
        durationOrStock = itemType === 'service' ? 45 : 10;
      }

      const category = catIdx >= 0 ? String(row[catIdx] || "").trim() : "General";
      const description = descIdx >= 0 ? String(row[descIdx] || "").trim() : "";
      const imageUrl = imgIdx >= 0 ? String(row[imgIdx] || "").trim() : "";

      valid.push({
        type: itemType,
        name,
        category: category || "General",
        price,
        duration: itemType === 'service' ? durationOrStock : undefined,
        stock: itemType === 'product' ? durationOrStock : undefined,
        description: description || undefined,
        imageUrl: imageUrl.startsWith("http") ? imageUrl : undefined
      });
    });

    setValidationResult({
      validItems: valid,
      errorsCount: errors,
      warningsCount: warnings
    });
  };

  const handleConfirmImport = () => {
    if (!validationResult || validationResult.validItems.length === 0) {
      alert("No hay elementos válidos para importar.");
      return;
    }
    onImportSuccess(validationResult.validItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Importador Universal de Catálogo</h3>
              <p className="text-xs text-slate-400">Importa productos o servicios desde Excel (.xlsx, .xls) o CSV</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Tipo de Ítem */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">¿Qué estás importando?</span>
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => { setItemType('product'); setValidationResult(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  itemType === 'product' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Productos / Carta
              </button>
              <button
                type="button"
                onClick={() => { setItemType('service'); setValidationResult(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  itemType === 'service' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Servicios / Tratamientos
              </button>
            </div>
          </div>

          {/* Zona de Drop / Selección de Archivo */}
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition group text-center"
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Upload size={26} />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Arrastra aquí tu archivo o haz clic para seleccionarlo</p>
                <p className="text-xs text-slate-500 mt-1">Formatos soportados: Excel (.xlsx, .xls) o CSV</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="font-bold text-white text-xs truncate max-w-[280px] sm:max-w-md">{file.name}</p>
                  <p className="text-xs text-slate-400">{rawRows.length} filas detectadas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setRawHeaders([]); setRawRows([]); setValidationResult(null); }}
                className="text-xs text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-500/10 rounded-xl transition flex items-center gap-1 font-bold"
              >
                <Trash2 size={14} /> Cambiar
              </button>
            </div>
          )}

          {/* Mapeo de Columnas */}
          {rawHeaders.length > 0 && (
            <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <RefreshCw size={14} className="text-emerald-400" />
                  Mapeo de Columnas
                </h4>
                <span className="text-xs text-slate-500">Relaciona las columnas de tu archivo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Nombre <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={mappings.name}
                    onChange={(e) => { setMappings(m => ({ ...m, name: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Seleccionar --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={mappings.category}
                    onChange={(e) => { setMappings(m => ({ ...m, category: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Ignorar (General) --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Precio</label>
                  <select
                    value={mappings.price}
                    onChange={(e) => { setMappings(m => ({ ...m, price: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Ignorar ($0.00) --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Stock / Duración */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {itemType === 'service' ? 'Duración (min)' : 'Stock inicial'}
                  </label>
                  <select
                    value={mappings.durationOrStock}
                    onChange={(e) => { setMappings(m => ({ ...m, durationOrStock: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Por defecto ({itemType === 'service' ? '45 min' : '10 u'}) --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Descripción</label>
                  <select
                    value={mappings.description}
                    onChange={(e) => { setMappings(m => ({ ...m, description: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Opcional --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">URL de Imagen</label>
                  <select
                    value={mappings.imageUrl}
                    onChange={(e) => { setMappings(m => ({ ...m, imageUrl: e.target.value })); setValidationResult(null); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Opcional --</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleValidateAndPreview}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <Eye size={14} /> Validar y Previsualizar
                </button>
              </div>
            </div>
          )}

          {/* Resultado de Validación y Preview */}
          {validationResult && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>{validationResult.validItems.length} registros listos para importar</span>
                </div>
                {validationResult.errorsCount > 0 && (
                  <span className="text-xs text-amber-400 font-semibold">
                    {validationResult.errorsCount} filas omitidas por falta de nombre
                  </span>
                )}
              </div>

              {/* Tabla de Preview */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Precio</th>
                      <th className="p-3">{itemType === 'service' ? 'Duración' : 'Stock'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-medium">
                    {validationResult.validItems.slice(0, 10).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="p-3 text-white font-bold">{it.name}</td>
                        <td className="p-3 text-slate-300">{it.category || 'General'}</td>
                        <td className="p-3 text-emerald-400 font-bold">${it.price?.toFixed(2)}</td>
                        <td className="p-3 text-slate-400">
                          {itemType === 'service' ? `${it.duration} min` : `${it.stock} u`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationResult.validItems.length > 10 && (
                <p className="text-xs text-slate-500 text-center">
                  Mostrando los primeros 10 de {validationResult.validItems.length} registros.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!validationResult || validationResult.validItems.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Check size={16} /> Importar al Catálogo ({validationResult?.validItems?.length || 0})
          </button>
        </div>
      </div>
    </div>
  );
}
