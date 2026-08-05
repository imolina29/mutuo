// src/components/declaration/declaration-card.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { DeclarationStatus } from "@/types";

interface DeclarationCardProps {
  id: string;
  status: DeclarationStatus;
  creatorName: string;
  invitedName: string | null;
  meetingDate: string | null;
  meetingPlace: string | null;
  meetingType: string | null;
  isCreator: boolean;
}

export function DeclarationCard(props: DeclarationCardProps) {
  const otherName = props.isCreator ? (props.invitedName ?? "Pendiente") : props.creatorName;

  return (
    <Link
      href={`/declarations/${props.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mutuo-primary focus-visible:ring-offset-2"
      aria-label={`Declaración con ${otherName}, estado: ${props.status}`}
    >
      <Card className="hover:border-mutuo-primary/50 transition-colors cursor-pointer">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{otherName}</p>
              {props.meetingDate && (
                <p className="text-sm text-mutuo-gray">
                  {new Date(props.meetingDate).toLocaleDateString("es-CO", { dateStyle: "long" })}
                </p>
              )}
              {props.meetingPlace && (
                <p className="text-sm text-mutuo-gray">
                  {props.meetingPlace}
                  {props.meetingType ? ` — ${props.meetingType}` : ""}
                </p>
              )}
            </div>
            <StatusBadge status={props.status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
