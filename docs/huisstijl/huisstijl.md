# Norday-huisstijl voor het PM-dashboard

Bron: Figma-bestand "Norday Website", pagina Handoff, frame Foundation (Typography, Spacing, Color, Misc). Uitgelezen op 4 oktober 2026. De waarden staan als design tokens in `tokens.css`.

## Kleuren

| Naam | Hex | Gebruik op de website |
|:---|:---|:---|
| Dark | `#3D1028` | Standaard tekst- en iconkleur, lijnen op lichte achtergrond, donkere secties |
| Pink | `#FF0D4A` | Accent |
| Yellow | `#FFF355` | Accent |
| Lilac | `#D5B3FF` | Accent; 40% als achtergrond van de sectie gerelateerde cases |
| White | `#FFFFFF` | Achtergrond; tekst, iconen en lijnen op donkere achtergrond |

Afgeleide kleuren uit "Color Usage":
- **Secundaire lijnen:** Dark 50% op licht, White 50% op donker.
- **Logo's in een logoblok:** monotoon in Dark 50%.

**Toegankelijkheid (WCAG 2.2 AA), zelf nagerekend:**
- Dark op White en Dark op Lilac zijn ruim voldoende voor alle tekst.
- Yellow en Lilac op Dark zijn ook ruim voldoende.
- Pink haalt de 4,5:1 voor gewone tekst **niet**, op wit noch op Dark (ongeveer 3,9:1 en 4,2:1). Gebruik Pink alleen voor grote tekst, randen, iconen en statusaccenten, niet voor lopende tekst of kleine labels.

## Typografie

Lettertypes:
- **Apercu Condensed Pro Bold (700):** koppen, altijd in hoofdletters met -3% letterspatiëring.
- **Suisse Int'l:** Light (300), Regular (400), Book, Medium (500) en Semi Bold (600) voor de rest.

Let op: beide zijn commerciële lettertypes en staan niet op Google Fonts. Vraag de lettertypebestanden en de licentie op bij het Brand-team. Tot die er zijn, gebruik je de terugvalfonts uit `tokens.css`.

| Stijl | Gebruik | Lettertype | Desktop | Mobiel | Regelhoogte | Overig |
|:---|:---|:---|---:|---:|:---|:---|
| heading-huge (H1) | Paginatitel | Apercu Cond. Bold | 129px | 50px | 90% | Hoofdletters, -3% |
| heading-large-huge (H2) | Case-detailkop | Suisse Medium | 72px | 40px | 100% | |
| heading-large (H3) | Servicekoppen, kleine cijfers | Apercu Cond. Bold | 70px | 35px | 100% | Hoofdletters, -3% |
| heading-medium-large (H4) | Contactkop | Apercu Cond. Bold | 64px | 35px | 100% | Hoofdletters, -3% |
| heading-medium (H5) | Sectietitels | Apercu Cond. Bold | 40px | 28px | 100% | Hoofdletters, -3% |
| heading-small (UI Heading 1) | Teasertitels | Suisse Medium (mobiel Semi Bold) | 28px | 20px | 120% (mobiel 150%) | |
| heading-tiny (UI Heading 2) | Kleine koppen | Apercu Cond. Bold | 25px | 20px | 100% | Hoofdletters, -3% |
| text-huge (Large Text 1) | Grote intro | Suisse Regular | 72px | 32px | 100% | |
| text-large (Large Text 2) | Quote | Suisse Book | 48px | 22px | 130% | |
| text-medium-large (Large Text 3) | Kleine quote | Suisse Regular | 28px | n.v.t. | 140% | |
| text-medium (Body 1) | Lopende tekst | Suisse Regular | 22px | 16px | 150% (mobiel 135%) | Strong: Semi Bold |
| text-small (Body 2) | Kleine tekst | Suisse Regular | 17px | 14px | 150% (mobiel 135%) | Strong: Medium |
| label (Label 1) | Grote tags | Suisse Regular | 17px | 14px | 150% (mobiel 135%) | Hoofdletters |
| label-small (Label 2) | Kleine tags | Suisse Regular | 12px | 12px | 150% (mobiel 135%) | Hoofdletters |
| huge-numbers | Grote cijfers | Apercu Cond. Bold | 120px | 50px | 100% | Hoofdletters, -3% |

**Voor een dashboard:** de websitematen zijn bedoeld voor een marketingsite. Gebruik in het dashboard vooral heading-medium (H5), heading-small, heading-tiny, Body 1 en 2 en de labels. Voor grote getallen, zoals een budgetpercentage, past huge-numbers op mobielformaat (50px).

## Ruimte en grid

- **Spacing-schaal:** 4, 8, 12, 16, 20, 24, 28, 32, 36, 48, 64, 72, 96, 120 en 144px (spacing-01 tot en met spacing-15).
- **Desktop-grid:** 12 kolommen (fluid), gutter 40px, buitenmarge 80px, ruimte tussen blokken 144px.
- **Mobiel grid:** 6 kolommen (fluid), gutter 12px, buitenmarge 16px, ruimte tussen blokken 96px.
- **Voor een dashboard** zijn de websitemarges te ruim. Gebruik de schaal, maar met kleinere stappen: binnen kaarten 16 tot 24px, tussen secties 48 tot 64px.

## Beeldverhoudingen (website)

1:1 (team, insights), 16:9 (headers), 3:4 (projectteasers), 4:3 (domeinen), 4:5 (galerij), 2.39:1.

## Wat nog ontbreekt

- **Logo:** als SVG, in `docs/huisstijl/logo/`. Op de Handoff-pagina staan OG-image en favicon, maar het losse logo moet het Brand-team leveren.
- **Knoppen, links en kaarten:** die staan in het frame "Partials" in hetzelfde Figma-bestand. Haal ze daaruit op als je componenten bouwt.
- **Lettertypebestanden en licentie:** voor Suisse Int'l en Apercu Condensed Pro. Zet ze in `docs/huisstijl/fonts/` en houd ze buiten Git (zie hoofdstuk 7 van de briefing).
