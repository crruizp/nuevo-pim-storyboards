#!/usr/bin/env bash
# Script para publicar el sitio en GitHub Pages de una sola vez.
# Requisitos: gh CLI (ya instalado en tu máquina) y git.

set -euo pipefail

USUARIO="crruizp"
REPO="nuevo-pim-storyboards"

cd "$(dirname "$0")"

# Proteger los artefactos manuales que deben sobrevivir a cualquier regeneración.
PROTECTED_PATHS=(
  "flujo-guiado/index.html"
  "flujo-guiado/presentacion.js"
  "simulador/presentation-launcher.js"
)

for protected_path in "${PROTECTED_PATHS[@]}"; do
  if [[ ! -f "$protected_path" ]]; then
    echo "ERROR: falta el archivo protegido $protected_path"
    exit 1
  fi
done

echo "→ Validando colección y recorridos del simulador…"
node scripts/validate-simulator.mjs
echo "   ✓ Simulador y colección consistentes"
echo

echo "═══════════════════════════════════════════════════════════"
echo "  Publicando $REPO en GitHub Pages"
echo "═══════════════════════════════════════════════════════════"
echo

# 1. Verificar autenticación de gh (abre browser si hace falta).
echo "→ 1/4 · Verificando autenticación de GitHub…"
if ! gh auth status >/dev/null 2>&1; then
  echo "   Necesitas autenticarte. Se abrirá tu navegador."
  gh auth login --git-protocol https --web
fi
echo "   ✓ gh autenticado"
echo

# 2. Crear el repositorio en GitHub (si no existe).
echo "→ 2/4 · Creando repo $USUARIO/$REPO en GitHub…"
if gh repo view "$USUARIO/$REPO" >/dev/null 2>&1; then
  echo "   ✓ Ya existe · configurando remote"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$USUARIO/$REPO.git"
else
  gh repo create "$USUARIO/$REPO" --public --source=. --remote=origin --description="Storyboards del Nuevo PIM · AI Knowledge Framework + Catalogación por API"
  echo "   ✓ Repo creado"
fi
echo

# 3. Empujar.
echo "→ 3/4 · Subiendo contenido a GitHub…"
git push -u origin main
echo "   ✓ Push completo"
echo

# 4. Activar GitHub Pages (rama main, root).
echo "→ 4/4 · Activando GitHub Pages…"
gh api --method POST "/repos/$USUARIO/$REPO/pages" \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  >/dev/null 2>&1 || \
gh api --method PUT "/repos/$USUARIO/$REPO/pages" \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  >/dev/null 2>&1 || \
  echo "   (Si falla, actívalo manualmente en Settings → Pages)"

echo "   ✓ Pages activado"
echo
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Listo"
echo "═══════════════════════════════════════════════════════════"
echo
echo "   Tu sitio estará disponible en 1–2 minutos en:"
echo
echo "     https://$USUARIO.github.io/$REPO/"
echo
echo "   Para abrir el repo en el navegador:"
echo "     gh repo view --web"
echo
