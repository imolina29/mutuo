// src/lib/clauses.ts
import { ClauseType } from "@prisma/client";

export interface ClauseTemplate {
  type: ClauseType;
  text: string;
  required: boolean;
  description: string;
}

export const CLAUSE_TEMPLATES: ClauseTemplate[] = [
  {
    type: "VOLUNTARY_MEETING",
    text: "Ambas partes declaran que este encuentro es completamente voluntario y que ninguna de las partes ha sido coaccionada, presionada o influenciada para aceptar esta reunión.",
    required: true,
    description: "Encuentro voluntario (obligatoria)",
  },
  {
    type: "NO_SUBSTANCES",
    text: "Ambas partes declaran su intención de no consumir sustancias psicoactivas que puedan alterar su capacidad de juicio durante el encuentro.",
    required: false,
    description: "No consumo de sustancias psicoactivas",
  },
  {
    type: "RESPECT_WITHDRAWAL",
    text: "Ambas partes reconocen y respetan el derecho de la otra persona a retirarse del encuentro en cualquier momento, sin necesidad de justificación.",
    required: false,
    description: "Respeto al retiro voluntario",
  },
  {
    type: "NO_RECORDING",
    text: "Ambas partes acuerdan no realizar grabaciones de audio, video o fotografías durante el encuentro sin el consentimiento explícito de la otra persona.",
    required: false,
    description: "No grabación sin consentimiento",
  },
  {
    type: "PROFESSIONAL_CONTEXT",
    text: "Ambas partes reconocen que se conocieron en un contexto profesional/laboral y que este encuentro no afecta ni condiciona su relación profesional.",
    required: false,
    description: "Contexto profesional/laboral",
  },
];

export function getClauseTemplate(type: ClauseType): ClauseTemplate | undefined {
  return CLAUSE_TEMPLATES.find((t) => t.type === type);
}
