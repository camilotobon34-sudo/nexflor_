"use client";

import { type FormEvent, useMemo, useState } from "react";
import { PencilLine, Plus, Search, X } from "lucide-react";
import { entityModules } from "@/lib/dashboard-types";
import type { EntityField, EntityRecord } from "@/lib/dashboard-types";
import { EmptyState } from "./empty-state";
import { SectionHeader } from "./section-header";
import { StorageNotice } from "./storage-notice";

type EntityModuleType = keyof typeof entityModules;

type EntityModuleProps = {
  kind: EntityModuleType;
};

function EntityFormField({
  field,
  defaultValue,
}: {
  field: EntityField;
  defaultValue: string;
}) {
  const id = `entity-${field.name}`;

  return (
    <div className="entity-form-field">
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <select defaultValue={defaultValue} disabled={field.disabled} id={id} name={field.name} required={field.required}>
          <option disabled value="">{field.placeholder}</option>
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          defaultValue={defaultValue}
          type={field.type ?? "text"}
        />
      )}
      {field.help && <small>{field.help}</small>}
    </div>
  );
}

function statusLabel(kind: EntityModuleType, status: string) {
  const statuses: Record<EntityModuleType, Record<string, string>> = {
    empresas: { active: "Activa", inactive: "Inactiva", activa: "Activa", inactiva: "Inactiva" },
    entrenadores: { active: "Activo", inactive: "Inactivo", activo: "Activo", inactivo: "Inactivo" },
    eventos: {
      scheduled: "Programado",
      programado: "Programado",
      "in progress": "En curso",
      "en curso": "En curso",
      completed: "Finalizado",
      finalizado: "Finalizado",
      cancelled: "Cancelado",
      cancelado: "Cancelado",
    },
  };
  return statuses[kind][status.toLocaleLowerCase()] ?? status;
}

export function EntityModule({ kind }: EntityModuleProps) {
  const config = entityModules[kind];
  const Icon = config.icon;
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const records = useMemo<EntityRecord[]>(() => [], []);
  const editingRecord = records.find(({ id }) => id === editingId);
  const filteredRecords = useMemo(
    () => records.filter(({ name }) => name.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    [query, records],
  );

  function submitWithoutPersistence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(editingRecord
      ? "La edición es una vista previa. No se modificó ningún registro: conecta Supabase para habilitar esta operación."
      : "El formulario es una vista previa. No se guardó ni modificó ningún registro: conecta Supabase para habilitar esta operación.");
  }

  return (
    <section>
      <SectionHeader
        action={
          <button
            className="primary-action"
            onClick={() => {
              if (!formOpen) setEditingId(null);
              setFormOpen((open) => !open);
              setMessage("");
            }}
            type="button"
          >
            {formOpen ? <X aria-hidden="true" size={17} /> : <Plus aria-hidden="true" size={17} />}
            {formOpen ? "Cerrar formulario" : config.newLabel}
          </button>
        }
        description={config.description}
        icon={Icon}
        title={config.title}
      />
      <StorageNotice />

      {formOpen && (
        <form className="dashboard-panel entity-form-panel" onSubmit={submitWithoutPersistence}>
          <div className="inline-form-heading">
            <div>
              <p className="panel-kicker">{editingRecord ? "ACTUALIZACIÓN DEL REGISTRO" : "NUEVO REGISTRO"}</p>
              <h2>{editingRecord ? `Editar ${config.singular}` : `Registrar ${config.singular}`}</h2>
            </div>
            <button aria-label="Cerrar formulario" className="icon-action" onClick={() => { setFormOpen(false); setEditingId(null); setMessage(""); }} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="entity-form-grid">
            {config.fields.map((field) => {
              const value = field.name === "name"
                ? editingRecord?.name ?? ""
                : field.name === "status"
                  ? editingRecord ? statusLabel(kind, editingRecord.status) : ""
                  : field.name === "company"
                    ? editingRecord?.company ?? ""
                    : field.name === "trainer"
                      ? editingRecord?.trainer ?? ""
                      : field.name === "date"
                        ? editingRecord?.eventDate ?? ""
                        : "";
              return <EntityFormField defaultValue={value} field={field} key={field.name} />;
            })}
            {kind === "entrenadores" && (
              <div className="trainer-code-hint">
                <span>CÓDIGO MAESTRO</span>
                <strong>Se asignará al conectar Supabase</strong>
                <small>La unicidad y la asignación del código dependen de la base de datos.</small>
              </div>
            )}
          </div>
          <div aria-live="polite" className="form-feedback">{message}</div>
          <div className="inline-form-actions">
            <button className="secondary-action" onClick={() => { setFormOpen(false); setEditingId(null); setMessage(""); }} type="button">Cancelar</button>
            <button className="primary-action" type="submit"><Plus aria-hidden="true" size={16} />{editingRecord ? "Revisar cambios" : "Revisar registro"}</button>
          </div>
        </form>
      )}

      <section aria-label={`Lista de ${config.title.toLowerCase()}`} className="dashboard-panel entity-list-panel">
        <header className="list-toolbar">
          <div>
            <h2>Registros de {config.title.toLowerCase()}</h2>
            <span>{records.length} registros</span>
          </div>
          <label className="search-field">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Buscar en {config.title.toLowerCase()}</span>
            <input onChange={(event) => setQuery(event.target.value)} placeholder={config.searchPlaceholder} value={query} />
          </label>
        </header>
        <div className="entity-table-wrap">
          <table className="entity-table">
            <thead>
              <tr>
                {config.columns.map((column) => <th key={column} scope="col">{column}</th>)}
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            {filteredRecords.length > 0 && (
              <tbody>
                {filteredRecords.map((record) => {
                  const cells = kind === "empresas"
                    ? [record.name, statusLabel(kind, record.status), record.createdAt]
                    : kind === "entrenadores"
                      ? [record.name, record.trainerCode ?? "Pendiente", statusLabel(kind, record.status), record.createdAt]
                      : [record.name, record.company ?? "—", record.eventDate ?? "—", record.trainer ?? "—", statusLabel(kind, record.status)];
                  const inactive = ["inactive", "inactiva", "inactivo", "cancelled", "cancelado"].includes(record.status.toLocaleLowerCase());
                  return (
                    <tr key={record.id}>
                      {cells.map((cell, index) => <td key={`${record.id}-${index}`}>{index === (kind === "empresas" ? 1 : kind === "entrenadores" ? 2 : 4) ? <span className={`record-status${inactive ? " record-status-inactive" : " record-status-active"}`}>{cell}</span> : cell}</td>)}
                      <td><button className="record-edit-button" onClick={() => { setEditingId(record.id); setFormOpen(true); setMessage(""); }} type="button"><PencilLine aria-hidden="true" size={13} />Editar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
          {filteredRecords.length === 0 && (
            <EmptyState
              icon={Icon}
              title={query ? "No encontramos coincidencias" : `Todavía no hay ${config.title.toLowerCase()}`}
              description={query ? "Prueba con otros términos." : `Los registros de ${config.title.toLowerCase()} aparecerán aquí cuando se conecte Supabase.`}
              action={query ? undefined : (
                <button className="secondary-action" onClick={() => setFormOpen(true)} type="button">
                  <Plus aria-hidden="true" size={15} /> Preparar un registro
                </button>
              )}
            />
          )}
        </div>
      </section>
    </section>
  );
}
