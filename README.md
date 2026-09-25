# Casino Friends v2

Aplicación multijugador de casino social con **dinero virtual**.

## Incluye
- Creación de salas con código aleatorio.
- Enlace de invitación con el código de sala.
- Nombres y saldo visibles en tiempo real.
- 1.000 € virtuales para cada participante.
- Ruleta española 0–36.
- Blackjack.
- Tragaperras.
- Chicken Run / juego del pollo con multiplicador y cobro.
- Admin de sala.
- Reinicio global a 1.000 €.
- Si el admin se desconecta, el siguiente jugador conectado pasa a ser admin.
- Interfaz responsive.

## Arranque local

Requiere Node.js.

```bash
npm install
npm start
```

Después abre http://localhost:3000

## Publicación

Sube el proyecto a un servicio que ejecute Node.js y soporte WebSockets. Configura el comando de inicio como:

npm start

La aplicación usa `process.env.PORT`, por lo que es compatible con hosts que asignan el puerto automáticamente.

## Nota

La aplicación está diseñada como juego social con moneda ficticia. No incluye depósitos, retiradas, pagos, premios monetarios ni conexión con servicios de apuestas.
