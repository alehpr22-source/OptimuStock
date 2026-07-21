# OptimuStock Perú

Prototipo funcional de app móvil para dueños de bodegas y minimarkets en Perú.
Ayuda a reducir mermas por vencimiento y quiebres de stock mediante alertas y sugerencias de compra.

## Stack

- HTML5 + CSS3 + JavaScript (Vanilla)
- Supabase (PostgreSQL)
- Lucide Icons

## Estructura

```
├── index.html          # SPA con 5 pantallas
├── css/
│   └── styles.css      # Estilos mobile-first con variables de marca
├── js/
│   └── app.js          # Lógica de negocio y conexión Supabase
├── images/
│   └── Logo.png        # Logotipo de la aplicación
├── .env.example        # Variables de entorno de referencia
├── vercel.json         # Configuración de despliegue
└── README.md
```

## Desarrollo local

```bash
npx serve .
# o
python -m http.server 8000
```

Luego abre http://localhost:8000

## Despliegue

Conecta este repositorio a [Vercel](https://vercel.com) para desplegar automáticamente.
