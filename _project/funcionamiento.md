# PromptVault — Funcionamiento

> Documento explicativo para jueces del hackathon y cualquier persona que quiera entender cómo funciona PromptVault por dentro.

---

## 1. ¿Qué es PromptVault?

PromptVault es una plataforma que permite a creadores de IA cifrar sus prompts y datasets más valiosos utilizando **threshold encryption** distribuido, y controlar el acceso mediante condiciones on-chain en **Story Protocol**.

En lugar de confiar en un servidor centralizado que puede ser hackeado o comprometido, la clave de descifrado se divide entre múltiples validadores independientes. Ninguna entidad individual —ni siquiera nosotros— puede descifrar el contenido sin autorización.

---

## 2. El Problema que Resuelve

Los prompts de IA son propiedad intelectual valiosa. Un buen prompt de ingeniería puede marcar la diferencia entre una respuesta mediocre y un resultado excepcional. Sin embargo:

- **No hay registro de propiedad** — cualquiera puede copiar un prompt y usarlo sin permiso.
- **No hay monetización** — los creadores comparten prompts gratis en Discord, Reddit o repositorios públicos sin recibir nada a cambio.
- **No hay control de acceso** — una vez que compartes un prompt, pierdes control sobre quién lo usa y cómo.
- **Los servidores centralizados son vulnerables** — un solo punto de falla compromete todos los datos.

PromptVault resuelve todo esto combinando cifrado umbral, registro de propiedad intelectual on-chain, y licencias programáticas.

---

## 3. Arquitectura General

```
Usuario → [Privy Auth] → [Frontend Next.js 16]
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
            [Story Protocol]  [CDR]   [PostgreSQL]
            (IP Assets,       (Threshold  (Vaults DB,
             Licencias,       Encryption)  Users)
             Marketplace)
                    │
                    ▼
                [IPFS]
            (Contenido cifrado)
```

### Componentes clave

| Componente | Rol |
|------------|-----|
| **Privy** | Autenticación social (Google, GitHub, email) + wallets embebidas |
| **Next.js 16** | Frontend y server actions |
| **Story Protocol** | Registro de IP Assets, mint de license tokens, marketplace |
| **CDR SDK** | Threshold encryption (Shamir's Secret Sharing 3-of-5) |
| **PostgreSQL (Supabase)** | Metadatos de vaults, usuarios, precios |
| **IPFS (Pinata)** | Almacenamiento descentralizado del contenido cifrado |

---

## 4. Flujo Completo — Paso a Paso

### 4.1 Crear un Vault (Licensed)

Este es el flujo principal para vaults que se venden en el marketplace:

```
Wallet → Elegir "Licensed Vault" → Subir archivo → Poner precio
    │
    ▼
1. Cifrar contenido con AES-256-GCM (clave aleatoria, en el navegador)
    │
    ▼
2. Subir blob cifrado a IPFS → obtener CID
    │
    ▼
3. Registrar IP Asset en Story Protocol
   └─ mintAndRegisterIpAssetWithPilTerms()
   ─ Incluye metadata + términos de licencia
    │
    ▼
4. Mint license token (1 por vault, para comprobación)
    │
    ▼
5. CDR: Allocate vault con condición de lectura = LICENSE_READ_CONDITION
   └─ El data key se cifra con la clave pública global de CDR
   └─ Se divide en 5 partials (Shamir's Secret Sharing)
   └─ Se distribuye a los 5 validadores CDR
    │
    ▼
6. Guardar en DB: uuid, CID, ipId, licenseTokenId, precio, owner
```

**¿Por qué AES + CDR?** El contenido real se cifra con AES-256-GCM (rápido, estándar). La clave AES se cifra con CDR (threshold encryption). Así combinamos velocidad con seguridad distribuida.

### 4.2 Acceder a un Vault (Threshold Decryption)

Cuando un usuario compra una licencia y quiere leer el contenido:

```
Usuario tiene licenseTokenId → hace clic en "Access"
    │
    ▼
1. Frontend envía solicitud a CDR: uuid + licenseTokenId
    │
    ▼
2. CDR validators verifican condición en LICENSE_READ_CONDITION
   └─ El contrato llama a LicenseToken.ownerOf(tokenId)
   └─ Verifica que el wallet del usuario es el owner del token
    │
    ▼ (si pasa validación)
3. Cada validator devuelve su partial (3 de 5 necesarios)
    │
    ▼
4. CDR SDK reconstruye el data key con 3 partials
    │
    ▼
5. Data key descifra el contenido AES-256-GCM localmente
    │
    ▼
6. Se muestra el contenido en pantalla
```

**¿Qué pasa si no tienes licencia?** Los validadores simplemente deniegan los partials. El data key nunca se reconstruye. El contenido permanece cifrado.

### 4.3 Acceso por Backup Local (Wallet Signature)

Para vaults propios (cuando eres el creador), hay un camino más rápido sin pasar por CDR:

```
1. Firmar mensaje EIP-712 con la wallet
    │
    ▼
2. La firma deriva la clave AES directamente
   └─ Usa la wallet address como semilla + el UUID del vault
    │
    ▼
3. Descifra el data key localmente (sin validadores)
    │
    ▼
4. Data key descifra el contenido AES-256-GCM
```

**Ventaja**: Instantáneo, sin gas, sin esperar a validadores (30-90s).
**Limitación**: Solo funciona para la wallet que creó el vault.

#### 4.3.1 Backup para Compradores

Los compradores también tienen acceso a backup local, pero con un paso previo:

```
1. Primera vez: "Unlock via CDR Network" (threshold decryption, ~30-90s, gas)
    │
    ▼
2. Al completarse, el frontend guarda automáticamente
   un backup cifrado en purchases.encryptedDataKey
   └─ Clave = (vaultUuid, buyerAddress)
   └─ Cifrado con EIP-712 + wallet del comprador
    │
    ▼
3. Segunda vez en adelante: "Recover from Local Backup"
   └─ Firma EIP-712 → deriva clave AES → descifra data key
   └-- Sin gas, sin validadores, instantáneo
```

El backup del comprador se almacena en la tabla `purchases` (no en `vaults`), keyeado por `(vaultUuid, buyerAddress)`. La wallet que firma es la del comprador, no la del creador. El código en `unlock/page.tsx` distingue automáticamente: si eres el creador busca en `vaults.encryptedDataKey`; si eres comprador busca en `purchases.encryptedDataKey`.

**Requisito**: Haber completado al menos un CDR unlock exitoso. El backup se crea como efecto secundario de ese primer acceso.

### 4.4 Compra en Marketplace

```
Comprador encuentra vault en Explorar → hace clic
    │
    ▼
1. Ve detalle: título, descripción, precio (en MUSDC)
    │
    ▼
2. Hace clic en "Buy"
    │
    ▼
3. Frontend llama al contrato Marketplace:
   └─ approve(MUSDC, amount)
   └─ purchaseVault(vaultId, price)
   └─ El contrato transfiere MUSDC al creador
   └─ Minta license token para el comprador
    │
    ▼
4. Comprador puede acceder al contenido (ver 4.2)
```

El marketplace usa MUSDC (una moneda estable de la testnet) para simplificar los precios. 1 MUSDC = 1 centavo.

---

## 5. Modelo de Seguridad

### Threshold Encryption (3-of-5)

La clave maestra del vault se divide en 5 fragmentos (partials) usando **Shamir's Secret Sharing**. Cada fragmento se entrega a un validador CDR distinto. Para reconstruir la clave se necesitan al menos **3 de 5** fragmentos.

**¿Qué significa esto en la práctica?**

- **Ningún validador individual puede descifrar** — solo tiene un fragmento sin sentido.
- **Si un validador es comprometido** — los otros 4 siguen protegiendo la clave.
- **Si un validador cae** — los otros 4 pueden seguir sirviendo partials.
- **Ni siquiera nosotros (PromptVault)** podemos descifrar tus vaults.

### Cifrado Cliente-Sin-Servidor

Todo el cifrado y descifrado ocurre en el navegador del usuario. El servidor nunca ve:
- El contenido original del archivo
- La clave AES-256-GCM
- Los partials de CDR
- El contenido descifrado

### EIP-712 para Backup de Claves

La clave de respaldo se deriva de una firma EIP-712. Esto significa que:
- Solo la wallet que firmó puede derivar la clave
- La firma nunca se almacena en ningún lado
- No hay clave maestra centralizada que robar

---

## 6. Tipos de Vault

| Tipo | Acceso | IP Registration | Licencias | Marketplace | ¿Contrato propio? |
|------|--------|-----------------|-----------|-------------|-------------------|
| **Licensed** | License Token (ERC-721) | ✅ Story Protocol | ✅ Mintable | ✅ Visible | `LICENSE_READ_CONDITION` |
| **Private** | Solo owner wallet | ❌ | ❌ | ❌ Oculta | EOA del owner |
| **Time-Locked** | Cualquiera después de timestamp | ❌ | ❌ | ✅ Visible | `TIME_LOCK_READ_CONDITION` |

### Licensed Vault
El tipo principal. El creador registra su contenido como IP Asset en Story Protocol. Los compradores adquieren license tokens. Solo quienes tienen un token pueden descifrar.

### Private Vault
Máxima privacidad. La condición de lectura es la propia dirección EOA del creador. No hay registro IP, no hay licencias, no aparece en el marketplace. Solo la wallet del creador puede leer.

### Time-Locked Vault
Un contrato inteligente verifica que `block.timestamp >= unlockTime`. Cualquier persona puede acceder después de la fecha de desbloqueo. Ideal para lanzamientos programados, filtraciones controladas, o contenido que debe volverse público en una fecha específica.

---

## 7. Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4 |
| **3D** | React Three Fiber, Drei, Postprocessing |
| **Auth** | Privy (Google, GitHub, email, wallet) |
| **Blockchain** | Wagmi, Viem |
| **Story Protocol** | Core SDK v1.4+ (IP registration, licensing) |
| **CDR** | @piplabs/cdr-sdk (threshold encryption, DKG) |
| **Almacenamiento** | IPFS via Pinata |
| **Base de datos** | PostgreSQL via Supabase + Drizzle ORM |
| **Red** | Story Aeneid Testnet (Chain ID: 1315) |

---

## 8. Contratos Inteligentes (Aeneid Testnet)

### Propios (desplegados por PromptVault)

| Contrato | Dirección | Propósito |
|----------|-----------|-----------|
| `TimeLockReadCondition` | `0x46161d99592C2b5148a8c2593cDa268E052982F5` | Condición de lectura para vaults Time-Locked |
| `Marketplace` | Configurable via env | Compraventa de vaults con MUSDC |
| `MUSDC Token` | Configurable via env | Moneda estable para precios |

### De Story Protocol (pre-desplegados en Aeneid)

| Contrato | Dirección | Propósito |
|----------|-----------|-----------|
| `SPG_NFT_CONTRACT` | `0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc` | NFT vinculado a IP Assets |
| `LICENSE_TOKEN` | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` | License token ERC-721 |
| `LICENSING_MODULE` | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` | Módulo de licencias |
| `PI_LICENSE_TEMPLATE` | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` | Plantilla PIL |
| `WIP_TOKEN` | `0x1514000000000000000000000000000000000000` | Wrapped IP |
| `OWNER_WRITE_CONDITION` | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` | Condición de escritura (owner-only) |
| `LICENSE_READ_CONDITION` | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` | Condición de lectura (license-gated) |

---

## 9. ¿Por qué usar PromptVault? (Propuesta de Valor)

### 1. Threshold encryption sin trust
No tienes que confiar en PromptVault, ni en ningún servidor. La seguridad es matemática: 3 de 5 validadores deben cooperar. Ni siquiera podemos descifrar tus datos aunque quisiéramos.

### 2. Monetización sin revelar contenido
Puedes vender acceso a tus prompts más valiosos sin exponerlos. El comprador paga, recibe un license token, y solo entonces puede descifrar. Todo on-chain, todo verificable.

### 3. IP on-chain
Al registrar tu prompt como IP Asset en Story Protocol, estableces prueba de propiedad en la blockchain. Los términos de licencia son programáticos y auto-ejecutables.

### 4. Tres modelos de acceso
- **Licensed**: Para vender en marketplace.
- **Private**: Para tu uso personal, máximo nivel de privacidad.
- **Time-Locked**: Para lanzamientos programados o contenido que debe volverse público.

### 5. Sin single point of failure
- Si Pinata (IPFS) cae → el contenido sigue en CDR (los validadores almacenan los partials).
- Si un validador CDR cae → los otros 4 siguen funcionando.
- Si pierdes acceso a tu wallet → el backup EIP-712 te permite recuperar tus vaults privados (no aplica a licensed vaults comprados).

---

## 10. Preguntas Frecuentes (para Jueces del Hackathon)

### ¿Cómo se asegura que ni siquiera los validadores pueden ver el contenido?

Los validadores CDR solo almacenan **partials** de la clave — fragmentos individuales que por sí mismos no tienen sentido. El contenido real está cifrado con AES-256-GCM, y la clave AES está threshold-encrypted con CDR. Un validador con un solo partial no puede reconstruir la clave AES. Se necesitan 3 de 5 partials, y los validadores solo los entregan si la condición on-chain se cumple.

### ¿Qué pasa si pierdes acceso a tu wallet?

Para vaults **Private** que creaste tú mismo, el backup EIP-712 permite recuperar el acceso firmando con tu wallet. Mientras tengas acceso a Privy (Google/GitHub login) o a tu seed phrase, puedes recuperar tus vaults.

Para vaults **Licensed** que compraste, necesitas acceso a la wallet que compró el license token. El token ERC-721 está en esa wallet. Si la pierdes, pierdes acceso. Esto es intencional — es la misma seguridad que cualquier NFT.

**Importante**: Si ya completaste al menos un CDR unlock exitoso como comprador, el frontend guarda automáticamente un backup local cifrado con tu wallet en `purchases.encryptedDataKey`. Mientras tengas acceso a esa wallet (via Privy o seed phrase), puedes usar "Recover from Local Backup" sin necesidad del license token.

### ¿Cómo funciona el marketplace?

Los creadores listan sus vaults con un precio en MUSDC (moneda estable de testnet). Cuando un comprador paga:
1. El contrato Marketplace transfiere MUSDC al creador.
2. Minta un license token para el comprador.
3. El comprador puede descifrar usando el flujo de threshold decryption.

Los vaults Private no aparecen en el marketplace. Los vaults Time-Locked aparecen pero muestran un contador hasta su fecha de desbloqueo.

### ¿Qué hace diferente a PromptVault de soluciones existentes?

**vs. Google Drive / Dropbox cifrados**: Ellos tienen tus claves. PromptVault no. La threshold encryption significa que ni siquiera nosotros podemos descifrar tus datos.

**vs. IPFS público**: Tus datos en IPFS están cifrados. El CID es solo un blob binario sin sentido sin la clave. Nadie puede leer tu contenido aunque tenga el CID.

**vs. Story Protocol raw**: Story Protocol registra IP y maneja licencias, pero el contenido está en IPFS público sin cifrar. PromptVault añade la capa de threshold encryption que asegura que solo wallets autorizadas puedan descifrar.

**vs. otros CDR dApps**: PromptVault es la primera dApp que usa CDR para contenido de IA con integración completa de Story Protocol (registro IP + licensing + marketplace).

### ¿Cuál es el costo real de usar CDR?

CDR en testnet (Aeneid) usa gas en IP tokens (gratis del faucet). Cada operación cuesta aproximadamente:
- `allocate`: ~50,000 gas
- `write`: ~70,000 gas
- `access`: ~100,000 gas (incluye verificación on-chain + devolución de partials)

En mainnet, CDR tendría costos de gas asociados. Pero hay dos caminos sin gas:
- **Vaults Private**: Backup EIP-712 del creador, instantáneo.
- **Vaults Licensed (compradores)**: Tras el primer CDR unlock, el frontend guarda un backup local cifrado. Los accesos siguientes son "Recover from Local Backup" — sin gas, sin validadores.

### ¿Se puede migrar a mainnet?

Sí. Los contratos de Story Protocol en Aeneid son idénticos a los de mainnet (solo cambian las direcciones). El CDR SDK está diseñado para funcionar en cualquier red Story. La migración implicaría:
1. Desplegar los contratos propios (TimeLock, Marketplace, MUSDC) en mainnet
2. Actualizar las direcciones en `constants.ts`
3. Configurar un proxy CometBFT HTTPS para los validadores CDR
4. Apuntar a los RPCs de mainnet

El código frontend no necesita cambios.

### ¿Qué licencia usan los License Tokens?

Los license tokens usan **PIL (Programmable IP License)** de Story Protocol con estos términos:
- **Commercial use**: true (el comprador puede usar el prompt comercialmente)
- **Revenue share**: 0% (configurable por el creador)
- **Derivatives**: false (simplificación para el hackathon; el creador decide)
- **Minting fee**: El precio que el creador establece (en MUSDC)

### ¿Cómo se evita que alguien comparta el contenido descifrado?

Técnicamente no se puede prevenir — igual que no puedes evitar que alguien haga screenshot de un PDF. La propuesta de valor de PromptVault es:
1. **Registro de propiedad on-chain**: Si alguien comparte tu prompt, tienes prueba de que tú lo creaste primero.
2. **Trazabilidad**: Cada license token está vinculado a una wallet. Si alguien filtra contenido comprado, sabes quién fue.
3. **Confianza**: Los compradores legítimos prefieren pagar por contenido de calidad verificado que arriesgarse con prompts robados de fuentes dudosas.

### ¿Qué pasa si un validador CDR actúa maliciosamente?

El protocolo CDR está diseñado con un **DKG (Distributed Key Generation)** donde los validadores generan claves de forma distribuida. Si un validador entrega un partial inválido:
- Los otros validadores lo detectan durante la reconstrucción.
- El partial inválido se descarta y se usa otro.
- Con 3 de 5, incluso si 2 validadores fallan o actúan mal, el sistema sigue funcionando.

En un despliegue mainnet real, habría incentivos económicos (staking/slashing) para asegurar el buen comportamiento de los validadores.
