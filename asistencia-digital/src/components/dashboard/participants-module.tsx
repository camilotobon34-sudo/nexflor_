"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Row } from "read-excel-file/browser";
import { EmptyState } from "./empty-state";
import { SectionHeader } from "./section-header";
import { StorageNotice } from "./storage-notice";

type ParticipantPreview = {
  rowNumber: number;
  name: string;
  identification: string;
  errors: string[];
};

type ImportPreview = {
  fileName: string;
  participants: ParticipantPreview[];
  totalRows: number;
  duplicateIds: string[];
  columnErrors: string[];
  summaryErrors: string[];
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cellToText(value: unknown) {
  if (value instanceof Date) {
    return value.toLocaleDateString("es-CO");
  }
  return String(value ?? "").trim();
}

function makePreview(rows: Row[], fileName: string): ImportPreview {
  const headers = rows[0] ?? [];
  const normalizedHeaders = headers.map(normalizeHeader);
  const nameColumn = normalizedHeaders.findIndex((value) => ["nombre", "nombres"].includes(value));
  const identificationColumn = normalizedHeaders.findIndex((value) =>
    ["cedula", "identificacion", "numero de cedula", "numero de identificacion", "numero cedula"].includes(value),
  );
  const columnErrors: string[] = [];

  if (nameColumn === -1) columnErrors.push("No encontramos la columna “Nombre”.");
  if (identificationColumn === -1) columnErrors.push("No encontramos la columna “Cédula”.");

  const dataRows = rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((value) => String(value ?? "").trim()));

  if (headers.length === 0 || dataRows.length === 0) {
    columnErrors.push("El archivo no contiene filas con registros para revisar.");
  }

  const participants: ParticipantPreview[] = dataRows.map(({ row, rowNumber }) => {
    const name = nameColumn < 0 ? "" : cellToText(row[nameColumn]);
    const identification = identificationColumn < 0 ? "" : cellToText(row[identificationColumn]);
    const errors: string[] = [];

    if (nameColumn >= 0 && !name) errors.push("El nombre está vacío.");
    if (identificationColumn >= 0 && !identification) errors.push("La cédula está vacía.");

    return { rowNumber, name, identification, errors };
  });

  const occurrences = new Map<string, number>();
  for (const participant of participants) {
    if (participant.identification) {
      occurrences.set(
        participant.identification,
        (occurrences.get(participant.identification) ?? 0) + 1,
      );
    }
  }
  const duplicateIds = [...occurrences.entries()]
    .filter(([, count]) => count > 1)
    .map(([identification]) => identification);

  for (const participant of participants) {
    if (participant.identification && duplicateIds.includes(participant.identification)) {
      participant.errors.push("Esta cédula aparece más de una vez en el archivo.");
    }
  }

  return {
    fileName,
    participants,
    totalRows: dataRows.length,
    duplicateIds,
    columnErrors,
    summaryErrors: participants
      .filter(({ errors }) => errors.length > 0)
      .map(({ rowNumber, errors }) => `Fila ${rowNumber}: ${errors.join(" ")}`),
  };
}

export function ParticipantsModule() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setImportMessage("");
    setPreview(null);

    if (!/\.xlsx$/i.test(file.name)) {
      setError("Selecciona un archivo de Excel .xlsx. Convierte los archivos .xls antiguos antes de cargarlos.");
      event.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = await readXlsxFile(file);
      setPreview(makePreview(sheets[0]?.data ?? [], file.name));
    } catch (reason) {
      console.error("Could not read the selected participant spreadsheet.", reason);
      setError("No pudimos leer este archivo de Excel. Comprueba que sea válido y vuelve a intentarlo.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function submitManualParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualMessage("El formulario está preparado, pero no se guardó el participante. Conecta Supabase para habilitar el registro.");
  }

  const invalidRecords = preview
    ? preview.participants.filter(({ errors: rowErrors }) => rowErrors.length > 0).length
    : 0;
  const canImport = Boolean(
    preview &&
    preview.totalRows > 0 &&
    preview.columnErrors.length === 0 &&
    invalidRecords === 0,
  );

  return (
    <section>
      <SectionHeader
        action={
          <button
            className="secondary-action"
            onClick={() => { setManualOpen((open) => !open); setManualMessage(""); }}
            type="button"
          >
            {manualOpen ? <X aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            {manualOpen ? "Cerrar formulario" : "Registro manual"}
          </button>
        }
        description="Importa participantes desde Excel y revisa sus datos antes de preparar la carga."
        icon={Users}
        title="Participantes"
      />
      <StorageNotice />

      <div className="participant-summary">
        <article className="participant-count-card dashboard-panel">
          <span className="metric-icon"><Users aria-hidden="true" size={19} /></span>
          <div><strong>0</strong><span>Participantes almacenados · Supabase pendiente</span></div>
        </article>
        <p>La vista previa se procesa en este navegador. El archivo y los registros no se cargan a ningún servidor.</p>
      </div>

      {manualOpen && (
        <form className="dashboard-panel participant-manual-form" onSubmit={submitManualParticipant}>
          <div className="inline-form-heading">
            <div><p className="panel-kicker">REGISTRO INDIVIDUAL</p><h2>Preparar participante</h2></div>
            <button aria-label="Cerrar formulario" className="icon-action" onClick={() => { setManualOpen(false); setManualMessage(""); }} type="button"><X aria-hidden="true" size={18} /></button>
          </div>
          <div className="manual-fields">
            <div className="entity-form-field"><label htmlFor="manual-participant-name">Nombre</label><input autoComplete="name" id="manual-participant-name" name="name" placeholder="Nombre completo" required /></div>
            <div className="entity-form-field"><label htmlFor="manual-participant-id">Cédula</label><input autoComplete="off" id="manual-participant-id" name="identification" placeholder="Número de identificación" required /></div>
          </div>
          <div aria-live="polite" className="form-feedback">{manualMessage}</div>
          <div className="inline-form-actions"><button className="primary-action" type="submit"><Plus aria-hidden="true" size={16} />Revisar registro</button></div>
        </form>
      )}

      <div className="participant-layout">
        <section className="dashboard-panel import-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">CARGA DE ARCHIVO</p><h2>Importar desde Excel</h2><p className="panel-subtitle">Columnas necesarias: <strong>Nombre</strong> y <strong>Cédula</strong>.</p></div>
            <span className="import-file-icon"><FileSpreadsheet aria-hidden="true" size={20} /></span>
          </div>
          <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" id="participant-file" onChange={handleFileChange} ref={fileInput} type="file" />
          <button className="file-dropzone" disabled={loading} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const droppedFile = event.dataTransfer.files[0]; if (droppedFile && fileInput.current) { const dataTransfer = new DataTransfer(); dataTransfer.items.add(droppedFile); fileInput.current.files = dataTransfer.files; fileInput.current.dispatchEvent(new Event("change", { bubbles: true })); } }} type="button">
            <span className="dropzone-icon">{loading ? <LoaderCircle aria-hidden="true" className="loading-icon" size={22} /> : <FileUp aria-hidden="true" size={22} />}</span>
            <strong>{loading ? "Revisando el archivo..." : "Selecciona o arrastra un archivo Excel"}</strong>
            <span>{loading ? "El archivo se procesa localmente en tu navegador." : "Formato compatible: .xlsx · Los datos no se envían a ningún servidor"}</span>
            {!loading && <span className="dropzone-cta"><ArrowDownToLine aria-hidden="true" size={14} />Seleccionar archivo</span>}
          </button>
          {error && <p className="validation-alert" role="alert"><AlertCircle aria-hidden="true" size={16} />{error}</p>}
          {preview && (
            <div className="file-preview-name">
              <FileSpreadsheet aria-hidden="true" size={16} />
              <strong>{preview.fileName}</strong>
              <span>{preview.totalRows} {preview.totalRows === 1 ? "fila" : "filas"}</span>
              <button aria-label="Quitar archivo de vista previa" className="icon-action" onClick={() => { setPreview(null); setError(""); }} type="button"><Trash2 aria-hidden="true" size={15} /></button>
            </div>
          )}
        </section>

        <section className="dashboard-panel import-checklist">
          <p className="panel-kicker">CÓMO FUNCIONA</p>
          <h2>Una revisión antes de importar</h2>
          {[
            ["01", "Elige tu Excel", "Selecciona una hoja .xlsx."],
            ["02", "Revisa los registros", "Comprobamos nombres, cédulas y duplicados."],
            ["03", "Confirma cuando esté listo", "La carga real requiere conexión con Supabase."],
          ].map(([number, title, description]) => <div className="checklist-step" key={number}><span>{number}</span><div><strong>{title}</strong><small>{description}</small></div></div>)}
        </section>
      </div>

      {preview && (
        <section aria-label="Vista previa y validación de participantes" className="dashboard-panel preview-panel">
          <div className="preview-heading">
            <div><p className="panel-kicker">VALIDACIÓN LOCAL</p><h2>Revisión de registros</h2><p>El archivo permanece en tu dispositivo; estos datos no se han importado.</p></div>
            <span className={`validation-badge${canImport ? " validation-good" : " validation-warning"}`}>
              {canImport ? <CheckCircle2 aria-hidden="true" size={15} /> : <AlertCircle aria-hidden="true" size={15} />}
              {canImport ? "Columnas listas" : "Hay observaciones"}
            </span>
          </div>
          <div className="validation-summary">
            <span><CheckCircle2 aria-hidden="true" size={16} />{preview.totalRows} registros en archivo</span>
            <span><Users aria-hidden="true" size={16} />{preview.participants.length - invalidRecords} válidos</span>
            <span><AlertCircle aria-hidden="true" size={16} />{invalidRecords} con errores</span>
            <span><Trash2 aria-hidden="true" size={15} />{preview.duplicateIds.length} cédulas duplicadas</span>
          </div>
          <p className="validation-scope-note">Las cédulas duplicadas se comparan solo dentro de este archivo. La verificación contra participantes ya registrados requiere Supabase.</p>
          {preview.columnErrors.length > 0 && <div className="validation-errors" role="alert"><strong>Problemas con las columnas</strong>{preview.columnErrors.map((columnError) => <p key={columnError}>{columnError}</p>)}</div>}
          {preview.summaryErrors.length > 0 && <div className="validation-errors" role="alert"><strong>Revisa estos registros</strong>{preview.summaryErrors.slice(0, 8).map((summaryError) => <p key={summaryError}>{summaryError}</p>)}{preview.summaryErrors.length > 8 && <small>Y {preview.summaryErrors.length - 8} fila(s) adicionales con errores.</small>}</div>}
          {preview.duplicateIds.length > 0 && <p className="duplicate-warning"><AlertCircle aria-hidden="true" size={15} />Cédulas repetidas: {preview.duplicateIds.join(", ")}</p>}
          {preview.totalRows > 0 && preview.columnErrors.length === 0 && (
            <div className="entity-table-wrap preview-table-wrap">
              <table className="entity-table preview-table">
                <thead><tr><th>Fila</th><th>Nombre</th><th>Cédula</th><th>Validación</th></tr></thead>
                <tbody>
                  {preview.participants.map((participant) => <tr key={participant.rowNumber}><td>{participant.rowNumber}</td><td>{participant.name || "—"}</td><td>{participant.identification || "—"}</td><td>{participant.errors.length === 0 ? <span className="row-status row-status-ok"><CheckCircle2 aria-hidden="true" size={14} />Lista</span> : <span className="row-status row-status-error"><AlertCircle aria-hidden="true" size={14} />{participant.errors.join(" ")}</span>}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          <div className="preview-actions">
            <p>{canImport ? "Validación local terminada. La confirmación de importación requiere Supabase." : "Corrige los errores del archivo antes de continuar."}</p>
            <button className="primary-action" disabled={!canImport} onClick={() => setImportMessage("El archivo pasó la validación, pero no se importó. Conecta Supabase para guardar participantes.")} type="button"><CheckCircle2 aria-hidden="true" size={16} />Confirmar importación</button>
          </div>
          {importMessage && <p aria-live="polite" className="form-feedback">{importMessage}</p>}
        </section>
      )}

      {!preview && !manualOpen && (
        <div className="participants-empty-state"><EmptyState icon={Users} title="Tu lista de participantes comenzará aquí" description="Carga un Excel para validar sus filas en tu navegador o abre el registro manual para preparar un participante." action={<button className="secondary-action" onClick={() => setManualOpen(true)} type="button"><Plus aria-hidden="true" size={15} />Preparar registro manual</button>} /></div>
      )}
    </section>
  );
}
