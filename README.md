# Nuevo PIM · Storyboards

Motion graphics explicativos del Nuevo PIM de Liverpool, servidos como página estática en GitHub Pages.

🔗 **Publicado en:** https://crruizp.github.io/nuevo-pim-storyboards/

## Contenido

| Video | Duración | Para qué |
|---|---|---|
| **AI Knowledge Framework** | 3:50 | Framework de IA transversal con PIM como Piloto 01 |
| **Catalogación por API** | 6:04 | Flujo end-to-end entre seller, PIM y canales |

Ambos videos son **mudos** y están pensados para proyectar en una reunión y narrar en vivo (cada escena deja 10 s en pantalla para explicar).

La sección **Simulador API** (`/simulador/`) presenta el discovery funcional de catalogación:

- ocho etapas previas a la ejecución;
- requests conceptuales en tablas y responses ilustrativos en ventanas emergentes;
- happy path, coincidencia alta, modificación, corrección y concurrencia;
- decisiones contractuales pendientes, separadas de lo ya planteado.

Los ejemplos de response no representan todavía endpoints, payloads ni códigos definitivos.

La vista **Flujo guiado** (`/flujo-guiado/`) está pensada para exposición ejecutiva y técnica. Recorre el proceso por actores y decisiones, incluye una narración sugerida y permite cambiar entre alta nueva, producto existente, corrección y modificación de un publicado. El **Simulador API** conserva la ejecución técnica como respaldo de la explicación.

## Estructura del repo

```
.
├── index.html              Página principal (una sola, con secciones ancladas)
├── styles.css              Tema oscuro con la paleta Liverpool (rosa #E10098 + Inter)
└── assets/
    ├── videos/             Los dos MP4 + sus portadas JPG
    ├── laminas/            13 láminas PNG + storyboard PDF del flujo de catalogación
    └── gifs/               10 GIFs animados del AI Knowledge Framework
```

## Cómo actualizar

El sitio es HTML/CSS estático sin build. Para cambiar algo:

```bash
git clone https://github.com/crruizp/nuevo-pim-storyboards.git
cd nuevo-pim-storyboards
# Edita index.html o styles.css
git commit -am "qué cambié"
git push
```

GitHub Pages redeploya automáticamente en ~1 minuto.

## Previsualizar localmente

```bash
# Opción 1: abrir el archivo directamente
open index.html

# Opción 2: servidor HTTP local (recomendado para los videos)
python3 -m http.server 8000
# → http://localhost:8000
```

## Volver a generar los videos

Los videos se producen con [Remotion](https://remotion.dev) en el proyecto hermano:

```
/Users/crruizp/Plantillas/video-ai-knowledge-framework/
```

Para re-renderizar y copiar los MP4 aquí:

```bash
cd /Users/crruizp/Plantillas/video-ai-knowledge-framework

# AI Knowledge Framework
npx remotion render AIKnowledgeFramework out/ai-knowledge-framework.mp4 \
  --codec=h264 --crf=20 --concurrency=4 --port=3123
cp out/ai-knowledge-framework.mp4 ../nuevo-pim-storyboards/assets/videos/

# Catalogación por API
npx remotion render CatalogacionPorAPI out/catalogacion-por-api.mp4 \
  --codec=h264 --crf=20 --concurrency=4 --port=3133
cp out/catalogacion-por-api.mp4 ../nuevo-pim-storyboards/assets/videos/
```

## Licencia

Contenido interno de Liverpool · uso restringido.
