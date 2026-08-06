// src/components/declaration/clause-selector.tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CLAUSE_TEMPLATES } from "@/lib/clauses";

export interface SelectedClause {
  type: string;
  text: string;
}

interface ClauseSelectorProps {
  value: SelectedClause[];
  onChange: (clauses: SelectedClause[]) => void;
}

export function ClauseSelector({ value, onChange }: ClauseSelectorProps) {
  const [customText, setCustomText] = useState("");

  function toggleClause(type: string, text: string, checked: boolean) {
    if (checked) {
      onChange([...value, { type, text }]);
    } else {
      onChange(value.filter((c) => c.type !== type));
    }
  }

  function addCustom() {
    if (!customText.trim()) return;
    onChange([...value, { type: "CUSTOM", text: customText.trim() }]);
    setCustomText("");
  }

  function removeCustomAt(indexInValue: number) {
    onChange(value.filter((_, i) => i !== indexInValue));
  }

  const customClauses = value
    .map((clause, index) => ({ clause, index }))
    .filter(({ clause }) => clause.type === "CUSTOM");

  return (
    <div className="space-y-3">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium mb-1">Cláusulas de la declaración</legend>
        {CLAUSE_TEMPLATES.map((template) => {
          const isSelected = value.some((c) => c.type === template.type);
          return (
            <div key={template.type} className="flex items-start gap-2">
              <Checkbox
                id={template.type}
                checked={isSelected}
                disabled={template.required}
                aria-describedby={`${template.type}-desc`}
                onCheckedChange={(v) => toggleClause(template.type, template.text, v === true)}
              />
              <div>
                <Label htmlFor={template.type} className="text-sm font-medium">
                  {template.description}
                  {template.required && <span className="text-mutuo-danger ml-1">(obligatoria)</span>}
                </Label>
                <p id={`${template.type}-desc`} className="text-xs text-mutuo-gray mt-1">
                  {template.text}
                </p>
              </div>
            </div>
          );
        })}
      </fieldset>
      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="custom-clause">Cláusula personalizada (opcional)</Label>
        <Textarea
          id="custom-clause"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Escribe una cláusula personalizada..."
          maxLength={1000}
        />
        <Button
          type="button"
          variant="link"
          onClick={addCustom}
          className="h-auto p-0 text-sm text-mutuo-primary"
          disabled={!customText.trim()}
        >
          Agregar cláusula personalizada
        </Button>
        {customClauses.map(({ clause, index }) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-mutuo-gray-light rounded text-sm">
            <span className="flex-1">{clause.text}</span>
            <button
              type="button"
              className="text-mutuo-danger text-xs underline shrink-0"
              onClick={() => removeCustomAt(index)}
              aria-label="Eliminar cláusula personalizada"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
