# 📋 SPEC TÉCNICO — PromptVault (Hackathon Story Protocol + CDR)

> **Objetivo:** Construir un marketplace mínimo viable donde creadores de IA registren prompts/datasets como IP en Story Protocol, los encripten con CDR, y los licencien programáticamente.
> **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Privy + Story SDK + CDR SDK + wagmi/viem
> **Blockchain:** Story Protocol Aeneid Testnet
> **Deadline:** Hackathon

---

## 1. QUÉ ESTAMOS CREANDO

**Nombre del producto:** PromptVault  
**Concepto en una oración:** Un vault donde creadores de IA suben prompts o datasets, se registran automáticamente como Propiedad Intelectual (IP) en Story Protocol, se encriptan con CDR, y otros usuarios pueden comprar/licenciar acceso on-chain.

### Problemática que resuelve
Hoy los creadores de prompts y datasets de IA los comparten en plataformas centralizadas (HuggingFace, Reddit, Discord) sin:
- Registro de propiedad
- Regalías automáticas
- Control de quién los usa y cómo

PromptVault les permite monetizar y proteger sus datos de IA usando blockchain.

---

## 2. FLUJO DE USUARIO (Demo de 3 minutos)

### Actor 1: Creador (Uploader)
1. Entra a la app
2. Hace click en "Conectar" → elige Gmail, GitHub o Wallet
3. Si usa Gmail/GitHub, Privy crea una embedded wallet automáticamente
4. Va a "Subir Prompt"
5. Llena formulario:
   - Título del dataset/prompt
   - Descripción
   - Archivo: `.txt`, `.json` o `.csv` con prompts/datos de IA
   - Precio (en tokens de la testnet)
   - Tipo de licencia: "Uso personal" o "Uso comercial"
6. Hace click en "Registrar y Encriptar"
7. La app:
   - Lee el archivo
   - Lo encripta con CDR SDK
   - Sube el blob encriptado a IPFS (via Lighthouse o Pinata)
   - Registra el activo en Story Protocol con metadata + términos de licencia
   - Muestra confirmación con el IP ID

### Actor 2: Comprador (Buyer)
1. Entra a la app (login con Gmail/GitHub/Wallet)
2. Va a "Explorar"
3. Ve lista de prompts/datasets con:
   - Título, descripción, precio, autor
4. Hace click en uno → ve detalle
5. Hace click en "Comprar Acceso"
6. Firma transacción (o se firma automáticamente si es embedded wallet)
7. Story Protocol:
   - Valida el pago
   - Mintea un License Token
   - Asigna derechos al comprador
8. La app:
   - Verifica que el comprador tiene licencia válida
   - Usa CDR SDK para descifrar el archivo
   - Muestra el contenido en pantalla (o permite descarga)

---

## 3. STACK TÉCNICO COMPLETO

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui (para componentes rápidos)
- **Iconos:** lucide-react

### Autenticación / Wallet
- **Privy** (`@privy-io/react-auth`)
  - Login methods: `email`, `google`, `github`, `wallet`
  - Embedded wallets: createOnLogin para usuarios sin wallet
  - Chain: Story Aeneid Testnet

### Blockchain / Web3
- **wagmi** + **viem** (conectados via `@privy-io/wagmi`)
- **Story Protocol SDK:** `@story-protocol/core-sdk`
- **CDR SDK:** `@piplabs/cdr-sdk`

### Almacenamiento
- **IPFS via Lighthouse** (tiene tier gratuito y SDK sencillo)
  - Alternativa: Pinata (también gratuito)
- **Metadata:** IPFS (JSON con título, descripción, autor)

### Red
- **Story Aeneid Testnet**
  - RPC: `https://aeneid.storyrpc.io`
  - Chain ID: `1315`
  - Explorer: `https://aeneid.storyscan.xyz`
  - Faucet: `https://aeneid.faucet.story.foundation`

---

## 4. ESTRUCTURA DE ARCHIVOS

```
promptvault/
├── .env.local                          # Variables de entorno
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Providers (Privy + wagmi + Story)
│   │   ├── page.tsx                    # Landing / Hero
│   │   ├── upload/
│   │   │   └── page.tsx                # Formulario de subida
│   │   ├── explore/
│   │   │   └── page.tsx                # Lista de assets
│   │   └── asset/
│   │       └── [ipId]/
│   │           └── page.tsx            # Detalle de un asset + compra
│   ├── components/
│   │   ├── Navbar.tsx                  # Conectar wallet / ver dirección
│   │   ├── UploadForm.tsx              # Formulario de subida
│   │   ├── AssetCard.tsx               # Card para lista de explore
│   │   ├── AssetDetail.tsx             # Vista detalle + botón comprar
│   │   └── DecryptedView.tsx           # Muestra contenido descifrado
│   ├── hooks/
│   │   ├── useStoryClient.ts           # Inicializa Story SDK
│   │   ├── useRegisterIp.ts            # Hook para registrar IP
│   │   ├── useMintLicense.ts           # Hook para comprar licencia
│   │   ├── useCdrEncrypt.ts            # Hook para encriptar con CDR
│   │   └── useCdrDecrypt.ts            # Hook para descifrar con CDR
│   ├── lib/
│   │   ├── story.ts                    # Config de Story client
│   │   ├── cdr.ts                      # Config de CDR client
│   │   ├── ipfs.ts                     # Helpers para subir a IPFS
│   │   └── constants.ts                # Addresses, ABIs, config
│   └── types/
│       └── index.ts                    # Tipos de TypeScript
```

---

## 5. DEPENDENCIAS (package.json)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0",
    "@privy-io/react-auth": "^1.78.0",
    "@privy-io/wagmi": "^0.2.0",
    "wagmi": "^2.9.0",
    "viem": "^2.13.0",
    "@story-protocol/core-sdk": "^1.1.0",
    "@piplabs/cdr-sdk": "^0.1.0",
    "@lighthouse-web3/sdk": "^0.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 6. VARIABLES DE ENTORNO (.env.local)

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=tu_app_id_de_privy

# Story Protocol (Testnet)
NEXT_PUBLIC_STORY_RPC_URL=https://aeneid.storyrpc.io
NEXT_PUBLIC_STORY_CHAIN_ID=1315

# IPFS / Lighthouse
LIGHTHOUSE_API_KEY=tu_api_key_de_lighthouse

# Opcional: Explorer
NEXT_PUBLIC_STORY_EXPLORER=https://aeneid.storyscan.xyz
```

---

## 7. PASOS DE IMPLEMENTACIÓN (Roadmap)

### FASE 1: Setup Inicial (30 min)
1. Crear proyecto Next.js: `npx create-next-app@latest promptvault --typescript --tailwind --app`
2. Instalar todas las dependencias del package.json
3. Crear archivo `.env.local` con las variables
4. Configurar `tailwind.config.ts` con colores básicos
5. Correr `npm run dev` y verificar que levanta en `localhost:3000`

### FASE 2: Providers y Autenticación (45 min)
1. Crear `src/app/layout.tsx` con:
   - `PrivyProvider` (configurado para Aeneid, login social, embedded wallets)
   - `WagmiProvider` (usando el provider de Privy)
   - `QueryClientProvider` (de tanstack/react-query, requerido por wagmi)
2. Crear `src/components/Navbar.tsx` con:
   - Botón "Conectar" que llama a `login()` de Privy
   - Si está autenticado, muestra dirección truncada + botón "Desconectar"
3. Probar que login con Gmail funciona y crea wallet automáticamente

### FASE 3: Configurar Story SDK (30 min)
1. Crear `src/lib/story.ts`:
   - Inicializar `StoryClient` usando el wallet del usuario (viem walletClient)
   - Configurar para Aeneid Testnet
2. Crear `src/hooks/useStoryClient.ts`:
   - Hook que devuelve el StoryClient listo para usar
3. Verificar que puedes leer datos de la testnet (ej: consultar un IP Asset de ejemplo)

### FASE 4: Configurar CDR SDK (30 min)
1. Crear `src/lib/cdr.ts`:
   - Inicializar CDR client con la wallet del usuario
2. Crear `src/hooks/useCdrEncrypt.ts`:
   - Recibe un File (o string)
   - Retorna el blob encriptado + hash
3. Crear `src/hooks/useCdrDecrypt.ts`:
   - Recibe el hash/identificador del archivo encriptado
   - Verifica licencia on-chain
   - Retorna el contenido descifrado

### FASE 5: Subida de Archivos + IPFS (45 min)
1. Crear `src/lib/ipfs.ts`:
   - Función `uploadToIPFS(data: Blob)` usando Lighthouse SDK
   - Retorna el CID (hash IPFS)
2. Crear `src/app/upload/page.tsx` + `src/components/UploadForm.tsx`:
   - Input de título (texto)
   - Textarea de descripción
   - Input de archivo (aceptar .txt, .json, .csv)
   - Input de precio (número, en IP tokens de testnet)
   - Select de tipo de licencia (Personal / Comercial)
   - Botón "Registrar y Encriptar"
3. Al hacer submit:
   - Leer archivo con FileReader
   - Encriptar con CDR SDK
   - Subir blob encriptado a IPFS → obtener CID
   - Crear metadata JSON (título, descripción, CID del archivo, autor)
   - Subir metadata a IPFS → obtener CID de metadata

### FASE 6: Registro de IP en Story Protocol (60 min)
1. En el hook `useRegisterIp.ts`:
   - Usar `storyClient.ipAsset.register()` o `mintAndRegisterIpAssetWithPilTerms()`
   - Parámetros necesarios:
     - `ipMetadataURI`: CID de la metadata en IPFS
     - `ipMetadataHash`: hash de la metadata
     - `nftMetadataURI`: CID (puede ser el mismo o uno genérico)
     - `nftMetadataHash`: hash
     - `terms`: términos de licencia (precio, tipo de uso)
   - Retornar el `ipId` (identificador del IP Asset)
2. Integrar en el flujo de upload:
   - Después de subir a IPFS, llamar al registro
   - Mostrar loading state
   - Al confirmar, mostrar el IP ID y link al explorer

### FASE 7: Explorar / Marketplace (45 min)
1. Crear `src/app/explore/page.tsx`:
   - Lista de IP Assets registrados
   - Para el hackathon, puedes hardcodear los IP IDs de demo o indexar eventos
   - Cada item muestra: título, descripción, precio, autor
2. Crear `src/components/AssetCard.tsx`:
   - Card visual con info del asset
   - Botón "Ver detalle" → navega a `/asset/[ipId]`

### FASE 8: Detalle + Compra de Licencia (60 min)
1. Crear `src/app/asset/[ipId]/page.tsx`:
   - Lee el IP ID de la URL
   - Consulta Story Protocol para obtener metadata y términos
   - Muestra: título, descripción, precio, tipo de licencia, autor
2. Crear `src/hooks/useMintLicense.ts`:
   - Usar `storyClient.license.mintLicenseTokens()`
   - Parámetros: `licenseTermsId`, `amount`, `receiver`
   - El usuario paga el fee configurado en los términos
3. Botón "Comprar Acceso":
   - Llama a `mintLicenseTokens`
   - Espera confirmación
   - Una vez confirmado, habilita la vista descifrada

### FASE 9: Descifrado y Visualización (45 min)
1. Crear `src/components/DecryptedView.tsx`:
   - Verifica que el usuario actual tiene licencia válida para ese IP ID
   - Si sí: usa CDR SDK para descifrar el archivo desde IPFS
   - Muestra el contenido:
     - Si es .txt: texto plano
     - Si es .json: formateado bonito
     - Si es .csv: tabla simple
   - Botón "Descargar"
2. Si no tiene licencia: mostrar mensaje "Compra acceso para ver el contenido"

### FASE 10: Polish + Demo (30 min)
1. Agregar estados de loading en todos los botones
2. Agregar toasts de éxito/error (puedes usar sonner o simples alerts)
3. Hacer que la app sea responsive (móvil usable)
4. Preparar datos de demo:
   - Crear 2-3 prompts/datasets de ejemplo y subirlos tú mismo
   - Así cuando el jurado entre a "Explorar" ya vea contenido
5. Grabar video de demo (2-3 minutos mostrando flujo completo)

---

## 8. CONSIDERACIONES TÉCNICAS IMPORTANTES

### Story Protocol — Registro de IP
- Usa la función `mintAndRegisterIpAssetWithPilTerms` del SDK para hacer todo en una transacción (mint NFT + registrar IP + adjuntar términos de licencia).
- Los términos de licencia (PIL — Programmable IP License) definen:
  - `mintingFee`: cuánto cuesta la licencia (tu "precio")
  - `commercialUse`: true/false
  - `commercialRevShare`: porcentaje de regalías para el creador
  - `derivativesAllowed`: false (para simplificar)

### CDR SDK — Encriptación
- El flujo es:
  1. `cdr.encrypt(fileContent)` → retorna datos encriptados + clave pública
  2. Subir datos encriptados a IPFS
  3. Al descifrar: `cdr.decrypt(encryptedData, licenseProof)` donde `licenseProof` viene de Story Protocol (verificación de que el usuario tiene licencia)
- **Nota:** Revisa la documentación exacta de `@piplabs/cdr-sdk` porque la API puede variar. Si no hay docs claras, inspecciona los tipos de TypeScript del paquete.

### Privy — Embedded Wallets
- Cuando un usuario se loguea con Gmail/GitHub, Privy crea una wallet EOA automáticamente.
- Para firmar transacciones con Story SDK, necesitas pasar el `walletClient` de viem que Privy expone.
- Usa `usePrivy()` para obtener el usuario y `useWallets()` (de `@privy-io/react-auth`) para obtener la wallet activa y su provider.

### Gas / Faucet
- Todo corre en Aeneid Testnet. Los tokens son gratis.
- Ve a `https://aeneid.faucet.story.foundation` y pide tokens con la wallet del creador (la que usarás en la demo).
- Si usas embedded wallets de Privy, necesitarás una forma de enviar tokens de testnet a esas direcciones. Para simplificar:
  - Opción A: En la demo, usa tu propia wallet (MetaMask) tanto como creador como comprador
  - Opción B: Implementa un "faucet interno" que envíe 0.01 IP al usuario al primer login (más complejo, solo si sobra tiempo)

### Almacenamiento
- Lighthouse tiene SDK de Node.js que funciona en el frontend si usas su API key.
- Alternativa más simple: si Lighthouse da problemas, usa Pinata con su API REST directamente (fetch con FormData).
- El CID de IPFS se guarda en la metadata del IP Asset, así Story apunta al contenido.

---

## 9. CRITERIOS DE ÉXITO PARA EL HACKATHON

La app debe poder demostrar **de punta a punta**:

- [ ] Usuario se conecta con Gmail/GitHub (Privy crea wallet)
- [ ] Usuario sube un archivo .txt/.json con prompts/datos de IA
- [ ] Archivo se encripta con CDR
- [ ] Archivo encriptado se sube a IPFS
- [ ] Se registra como IP Asset en Story Protocol con precio y términos
- [ ] Otro usuario (o la misma wallet en modo comprador) ve el asset en "Explorar"
- [ ] Compra la licencia pagando tokens de testnet
- [ ] La app verifica la licencia y descifra el contenido
- [ ] El contenido se muestra en pantalla

**Nice-to-have (si sobra tiempo):**
- [ ] Filtros en Explore (por categoría, precio)
- [ ] Perfil del creador con sus assets
- [ ] Historial de transacciones
- [ ] Soporte para múltiples archivos en un solo asset
- [ ] Dark mode

---

## 10. RECURSOS Y DOCUMENTACIÓN

- **Story Protocol Docs:** https://docs.story.foundation
- **Story SDK Reference:** Busca `@story-protocol/core-sdk` en GitHub
- **CDR SDK:** `npm install @piplabs/cdr-sdk` — inspecciona tipos si no hay docs
- **Privy Docs:** https://docs.privy.io/guide/react/quickstart
- **Privy + wagmi:** https://docs.privy.io/guide/react/wallets/usage/wagmi
- **Story Aeneid Faucet:** https://aeneid.faucet.story.foundation
- **Story Explorer:** https://aeneid.storyscan.xyz
- **Lighthouse IPFS:** https://docs.lighthouse.storage

---

## 11. PITCH PARA EL JURADO (Copiar y adaptar)

> "PromptVault es un marketplace de datos de IA protegidos por derechos de autor on-chain. Los creadores suben prompts o datasets, se encriptan con CDR y se registran como Propiedad Intelectual en Story Protocol. Definen precio y términos de uso. Los compradores adquieren licencias programáticas — con regalías automáticas para el creador — y solo entonces pueden descifrar y usar los datos. Es la primera capa de infraestructura para una economía de datos de IA donde los creadores mantienen el control."

---

**Documento preparado para el agente de código. ¡A construir! 🚀**
