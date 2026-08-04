# Mutuo — Plataforma de Declaración de Intención Mutua

**Fecha:** 2026-08-04
**Estado:** En diseño
**Enfoque:** MVP Legal Robusto

## 1. Visión general

Aplicación web responsive que permite a dos personas firmar digitalmente una declaración de intención mutua antes de un encuentro. La declaración deja constancia de que ambas partes acuerdan voluntariamente reunirse, estableciendo expectativas y límites a través de cláusulas modulares.

### Problema que resuelve

En Colombia se presentan denuncias por acoso sexual donde la veracidad y el contexto son difíciles de establecer. Esta plataforma:

- Protege a víctimas reales creando un registro verificable de intenciones previas al encuentro
- Protege a personas falsamente acusadas al proveer evidencia de acuerdo mutuo
- No reemplaza la justicia ni determina culpabilidad — es una herramienta de registro

### Lo que NO es

- No es una app de citas
- No es un contrato de consentimiento sexual (el consentimiento sexual es siempre revocable)
- No reemplaza denuncias penales ni mecanismos del Estado
- No determina culpabilidad ni inocencia

### Público objetivo

Cualquier persona mayor de edad en Colombia, con énfasis en contextos laborales/profesionales donde las líneas entre lo profesional y personal generan conflictos.

### Alcance geográfico

Solo Colombia. Marco legal 100% colombiano.

### Monetización

Modelo mixto: gratuito al inicio para ganar tracción, con monetización posterior (freemium o tarifa mínima por declaración).

---

## 2. Arquitectura técnica

### Stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | Next.js (React) + TypeScript |
| Backend/API | Next.js API Routes |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | NextAuth.js (email + OTP) |
| Hosting frontend | Vercel |
| Hosting DB | Supabase o Railway |
| Notificaciones | Resend o SendGrid (email) |
| Timestamp Authority | FreeTSA.org (MVP), Certicámara (futuro) |

### Diagrama de arquitectura

```
┌─────────────────────────────────────┐
│         Usuario A (Navegador)       │
│         Usuario B (Navegador)       │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│       Next.js App (Vercel)          │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Frontend │  │   API Routes     │  │
│  │  (React) │  │  - Auth          │  │
│  │  Pages   │  │  - Declaraciones │  │
│  │  UI      │  │  - Verificación  │  │
│  └─────────┘  │  - Notificaciones│  │
│               │  - Custodia      │  │
│               └──────────────────┘  │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────────┐
    ▼          ▼              ▼
┌────────┐ ┌────────┐ ┌────────────┐
│PostgreSQL│ │Storage │ │ Servicios  │
│  - Users│ │  Docs  │ │  - Email   │
│  - Decl.│ │  Fotos │ │  - Hash/TSA│
│  - Audit│ │  Cédula│ │            │
└────────┘ └────────┘ └────────────┘
```

### Principios de diseño

- **Inmutabilidad:** Las declaraciones firmadas nunca se modifican. Los estados posteriores (cancelación, revocación, registro post-encuentro) se agregan como registros separados vinculados a la declaración original.
- **Auditoría completa:** Cada acción queda registrada con timestamp, IP y user-agent.
- **Privacidad por defecto:** Datos cifrados en reposo, acceso mínimo necesario.
- **Sin dependencias institucionales en MVP:** No se depende de Registraduría ni entidades externas.

---

## 3. Modelo de datos

### Tablas principales

#### `users`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| email | VARCHAR | Email del usuario |
| phone | VARCHAR | Teléfono del usuario |
| full_name | VARCHAR | Nombre completo |
| cedula_number | VARCHAR | Número de cédula de ciudadanía |
| verified | BOOLEAN | Si completó verificación de identidad |
| created_at | TIMESTAMP | Fecha de registro |

#### `identity_verifications`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| user_id | UUID (FK) | Referencia al usuario |
| cedula_front | VARCHAR | Ruta a foto cédula frontal (cifrada) |
| cedula_back | VARCHAR | Ruta a foto cédula posterior (cifrada) |
| selfie | VARCHAR | Ruta a selfie (cifrada) |
| match_score | FLOAT | Puntuación de coincidencia foto-selfie |
| verified_at | TIMESTAMP | Fecha de verificación |

#### `declarations`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| creator_id | UUID (FK) | Usuario que crea la declaración |
| invited_id | UUID (FK) | Usuario invitado (null hasta que se registre) |
| status | ENUM | Estado actual de la declaración |
| invite_token | UUID | Token único para el enlace de invitación |
| invite_token_expires_at | TIMESTAMP | Expiración del token (72 horas) |
| meeting_date | TIMESTAMP | Fecha/hora aproximada del encuentro |
| meeting_place | VARCHAR | Lugar general del encuentro |
| meeting_type | VARCHAR | Tipo de encuentro (cena, café, reunión, etc.) |
| current_round | INT | Ronda actual de negociación |
| max_rounds | INT (default 3) | Máximo de rondas permitidas |
| signed_by_a_at | TIMESTAMP | Timestamp de firma de persona A |
| signed_by_b_at | TIMESTAMP | Timestamp de firma de persona B |
| sealed_hash | VARCHAR | Hash SHA-256 del documento sellado |
| tsa_response | BYTEA | Respuesta de la TSA |
| sealed_at | TIMESTAMP | Momento del sellado |
| created_at | TIMESTAMP | Fecha de creación |

#### `clauses`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| declaration_id | UUID (FK) | Declaración a la que pertenece |
| type | ENUM | Tipo de cláusula (módulo) |
| text | TEXT | Texto de la cláusula |
| accepted_by_a | BOOLEAN | Aceptada por persona A |
| accepted_by_b | BOOLEAN | Aceptada por persona B |
| version | INT | Versión de la cláusula (cambia en negociación) |

Tipos de cláusulas (`type`):
- `voluntary_meeting` — Encuentro voluntario (obligatoria, siempre activa)
- `no_substances` — No consumo de sustancias psicoactivas
- `respect_withdrawal` — Respeto al retiro voluntario
- `no_recording` — No grabación sin consentimiento
- `professional_context` — Contexto profesional/laboral
- `custom` — Cláusula personalizada (texto libre)

#### `post_meeting`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| declaration_id | UUID (FK) | Declaración asociada |
| user_id | UUID (FK) | Usuario que registra |
| status | ENUM | ok / withdrew / other_withdrew / not_held |
| notes | TEXT | Notas opcionales |
| created_at | TIMESTAMP | Fecha de registro |

#### `audit_log`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| declaration_id | UUID (FK) | Declaración asociada (nullable) |
| user_id | UUID (FK) | Usuario que realizó la acción |
| action | VARCHAR | Tipo de acción |
| details | JSONB | Detalles adicionales |
| ip_address | INET | Dirección IP |
| user_agent | VARCHAR | User-agent del navegador |
| timestamp | TIMESTAMP | Momento de la acción |

#### `notifications`
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| user_id | UUID (FK) | Usuario destinatario |
| declaration_id | UUID (FK) | Declaración relacionada |
| type | ENUM | Tipo de notificación |
| channel | ENUM | Canal (email) |
| sent_at | TIMESTAMP | Fecha de envío |
| read_at | TIMESTAMP | Fecha de lectura |

### Estados de una declaración (`declarations.status`)

- `draft` — A está creando/editando
- `pending_b` — Enviada a B, esperando respuesta
- `negotiating` — B propuso cambios, en ronda de negociación
- `pending_a` — Esperando que A acepte los cambios de B
- `expired` — Se superaron las 3 rondas sin acuerdo
- `rejected` — Una de las partes rechazó
- `signed` — Ambas partes firmaron, documento sellado e inmutable
- `cancelled` — Cancelada antes del encuentro
- `revoked` — Consentimiento de intención revocado
- `completed` — Registro post-encuentro realizado por ambas partes

---

## 4. Flujos de usuario

### 4.1 Flujo Persona A (Creador)

1. Ingresa a la web
2. Se registra o inicia sesión (email + OTP)
3. Accede al dashboard
4. Crea nueva declaración:
   - Datos del encuentro (fecha, hora aprox, lugar, tipo)
   - Selección de cláusulas modulares
   - Cláusula "encuentro voluntario" siempre activa
5. Verificación de identidad (si no la ha completado):
   - Foto cédula frontal y posterior
   - Selfie en tiempo real
6. Vista previa de la declaración completa
7. Firma digital (aceptación explícita + checkbox legal)
8. Se genera enlace único de invitación (expira en 72h). A no necesita ingresar datos de B — el enlace es anónimo hasta que B lo abra y se registre/identifique
9. Comparte enlace por el medio que prefiera
10. Espera respuesta de B (notificaciones por email)

### 4.2 Flujo Persona B (Invitada)

1. Recibe enlace compartido por A
2. Abre enlace → ve landing con resumen de la declaración
3. Se registra o inicia sesión
4. Ve declaración completa con todas las cláusulas
5. Verificación de identidad (foto cédula + selfie)
6. Tres opciones:
   - **Aceptar** → firma → documento sellado → notifica a A
   - **Rechazar** → motivo opcional → notifica a A → fin
   - **Proponer cambios** → edita cláusulas/datos → notifica a A → ronda +1

### 4.3 Flujo de negociación

- Máximo 3 rondas de negociación
- Cada ronda queda en el historial de auditoría
- Si no hay acuerdo en 3 rondas, la declaración expira
- Para intentar nuevamente deben crear una nueva solicitud
- Una vez firmada por ambas partes, la declaración es inmutable

### 4.4 Flujo post-firma

**Antes del encuentro:**
- Cualquiera puede cancelar → queda registrado con timestamp → notifica a la otra parte
- Cualquiera puede revocar su intención → queda registrado con timestamp → notifica a la otra parte

**Después del encuentro:**
- Ambos reciben invitación para registro post-encuentro
- Opciones: "Encuentro sin novedad" / "Me retiré voluntariamente" / "La otra parte se retiró" / "No se realizó el encuentro"
- Cada registro con timestamp certificado

---

## 5. Sistema anti-abuso

### Límites y restricciones
- Máximo 3 declaraciones activas simultáneas por usuario
- Máximo 5 declaraciones creadas por día
- Cooldown de 24 horas si una persona recibe 3+ rechazos consecutivos
- Un usuario puede ser bloqueado si acumula un patrón de rechazos o reportes

### Mecanismos de protección
- Rate limiting en API
- Botón de reporte en cada invitación recibida
- Lista negra bidireccional (si B bloquea a A, A no puede enviar más invitaciones a B)
- Detección de patrones de abuso (muchas declaraciones rechazadas)
- CAPTCHA en la creación de declaraciones

---

## 6. Accesibilidad

WCAG 2.1 nivel AA:
- Contraste mínimo 4.5:1 en todos los textos
- Navegación completa por teclado
- Etiquetas ARIA en formularios y componentes interactivos
- Textos alternativos en imágenes e íconos
- Tamaños de fuente escalables
- Cláusulas legales en lenguaje sencillo con opción de ver texto formal

---

## 7. Marco legal colombiano

### Legislación aplicable

| Ley/Norma | Aplicación |
|---|---|
| Ley 527 de 1999 | Validez jurídica de mensajes de datos y firmas electrónicas |
| Ley 1581 de 2012 | Protección de datos personales (Habeas Data) |
| Decreto 1377 de 2013 | Procedimientos para autorización de tratamiento de datos |
| Ley 1273 de 2009 | Protección de la información, delitos informáticos |
| Código Penal Art. 205-210 | Delitos contra la libertad sexual |
| Ley 1257 de 2008 | Prevención y sanción de violencia contra la mujer |

### Disclaimers obligatorios

- "Esta declaración es una manifestación de voluntad de encuentro, no una autorización de actividad sexual"
- "El consentimiento es revocable en cualquier momento"
- "Esta plataforma no reemplaza los mecanismos de denuncia del Estado colombiano"
- Enlace visible a la Línea 155 (atención a víctimas de violencia de género)
- Enlace a la Fiscalía General de la Nación

### Documentos legales requeridos

- Términos y condiciones de uso
- Política de privacidad y tratamiento de datos (Ley 1581)
- Autorización explícita de tratamiento de datos personales
- Aviso de privacidad

---

## 8. Seguridad y custodia documental

### Cifrado
- En tránsito: HTTPS/TLS 1.3
- En reposo: AES-256 para datos sensibles (fotos cédula, selfies, datos personales)
- Autenticación: OTP por email (sin contraseñas)
- Tokens de invitación: UUID v4 con expiración de 72 horas

### Proceso de sellado

1. Ambas partes firman la declaración
2. Se construye documento canónico (JSON) con todos los datos
3. Se genera hash SHA-256 del documento completo
4. Se solicita estampa de tiempo a TSA (FreeTSA.org para MVP)
5. Se almacena: documento cifrado + hash + respuesta TSA

### Verificación de integridad

- Cualquier parte puede solicitar verificación en cualquier momento
- Se recalcula el hash y compara con el sellado
- El timestamp TSA prueba que el documento existía en ese momento exacto

### Auditoría

- Toda acción queda en `audit_log`
- Registros append-only (nunca se borran ni modifican)
- Cada registro: usuario, acción, timestamp, IP, user-agent, detalles JSON

### Retención de datos

- Declaraciones selladas: 5 años
- Datos de identidad (fotos): 1 año post-verificación, luego se elimina imagen y se conserva solo resultado
- Audit logs: 5 años
- Cuentas inactivas: notificación a los 2 años, eliminación a los 3 años

---

## 9. Estructura de páginas

```
/                           → Landing page
/auth/login                 → Login con OTP
/auth/register              → Registro nuevo usuario
/auth/verify                → Verificación de código OTP

/dashboard                  → Panel principal
/declarations/new           → Crear declaración
/declarations/[id]          → Ver declaración
/declarations/[id]/sign     → Pantalla de firma
/declarations/[id]/verify   → Verificar integridad
/declarations/[id]/post     → Registro post-encuentro

/invite/[token]             → Landing para persona B invitada

/identity/verify            → Flujo de verificación de identidad

/profile                    → Datos del usuario
/profile/blocked            → Lista de usuarios bloqueados

/legal/terms                → Términos y condiciones
/legal/privacy              → Política de privacidad
/legal/about                → Qué es la plataforma
/legal/help                 → Línea 155, Fiscalía, rutas de atención
```

### Diseño visual

- **Paleta:** Azul oscuro, blanco, gris. Acentos en verde (acciones positivas) y rojo (alertas)
- **Tipografía:** Sans-serif profesional (Inter o similar)
- **Tono:** Institucional y confiable
- **Mobile-first:** Funcional desde 320px
- **Componentes clave:** Cards con estado visual, stepper/wizard para creación y firma, timeline para historial, badges de estado

### Landing page

1. Hero con propuesta de valor y CTA
2. "¿Cómo funciona?" — 3 pasos (Crea → Comparte → Firman)
3. Marco legal — por qué tiene valor probatorio
4. Disclaimers visibles
5. Footer con enlaces legales, Línea 155, contacto

---

## 10. Alcance del MVP (Fase 1)

### Incluido en MVP
- Registro y autenticación por OTP (email)
- Verificación de identidad progresiva (datos básicos + foto cédula + selfie)
- Creación de declaración con cláusulas modulares
- Generación de enlace de invitación
- Flujo completo persona B (aceptar/rechazar/proponer cambios)
- Negociación hasta 3 rondas
- Sellado con hash SHA-256 + timestamp TSA
- Cancelación y revocación con timestamp
- Registro post-encuentro
- Notificaciones por email
- Sistema anti-abuso (límites, reportes, bloqueos)
- Accesibilidad WCAG 2.1 AA
- Disclaimers legales y enlaces a rutas de atención
- Landing page

### Fase 2 (post-validación)
- Integración con Registraduría para validación de cédula
- Notificaciones por SMS y WhatsApp
- TSA certificada en Colombia (Certicámara)
- Monetización (freemium o tarifa por declaración)
- App móvil nativa (si hay tracción)
- Estadísticas y reportes para el usuario
