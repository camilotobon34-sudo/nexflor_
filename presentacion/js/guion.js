/* Guion oral de NEXFLOR. Una entrada por diapositiva.
   El texto de la pantalla es corto. Esto es lo que se dice. */

window.GUION = {
    integrantes: {
        "Camilo": { nombre: "Camilo", color: "#8fd19a" },
        "Luisa": { nombre: "Luisa", color: "#d8f3dc" },
        "Alejandro": { nombre: "Alejandro", color: "#b7e4c7" },
        "Emiliano": { nombre: "Emiliano", color: "#52b788" },
    },

    escenas: [
        {
            titulo: "Portada", quien: "Camilo", seg: 40, pasos: 0,
            claves: ["Saludo", "Equipo", "NEXFLOR", "Flores El Trigal"],
            texto: "Muy buenos días. Les damos la bienvenida a nuestra presentación de la feria de la ciencia. Somos Camilo, Luisa, Alejandro y Emiliano, y hoy queremos compartirles NEXFLOR, una propuesta de innovación tecnológica pensada para Flores El Trigal. Nuestro propósito es conectar tecnología, conocimiento y bienestar mediante tres módulos: identificación, aprendizaje y prevención. A lo largo de la presentación explicaremos qué necesidad busca atender cada uno y cómo podrían integrarse en una sola plataforma. Gracias por acompañarnos; esperamos que conozcan y disfruten nuestra propuesta.",
        },
        {
            titulo: "¿Qué problema queremos mejorar?", quien: "Camilo", seg: 50, pasos: 0,
            claves: ["Identificar", "Capacitar", "Prevenir", "Presenta NEXFLOR"],
            texto: "Al pensar en cómo la tecnología puede apoyar el trabajo en una empresa floricultora, identificamos tres aspectos. El primero es reconocer y registrar a las personas autorizadas. El segundo es facilitar el aprendizaje de los procedimientos mediante cursos y actividades. El tercero es apoyar la prevención con avisos sobre posturas de trabajo que podrían ser inadecuadas. Son necesidades diferentes, pero nuestra propuesta busca reunirlas en un mismo sistema. A continuación, les presento nuestra solución: NEXFLOR.",
        },
        {
            titulo: "Nuestra solución: NEXFLOR", quien: "Camilo", seg: 45, pasos: 0,
            claves: ["Una plataforma", "ID", "Academy", "Posture"],
            texto: "NEXFLOR propone integrar identificación, formación y prevención en una sola plataforma. NEXFLOR ID apoya la identificación y el registro de las personas autorizadas; NEXFLOR ACADEMY propone cursos y actividades interactivas; y NEXFLOR POSTURE se orienta a generar alertas preventivas relacionadas con la postura. Cada módulo tiene una función distinta, pero juntos representan una propuesta de tecnología al servicio de las personas. Ahora Luisa explicará el recorrido propuesto para el sistema.",
        },
        {
            titulo: "¿Cómo funciona el sistema?", quien: "Luisa", seg: 50, pasos: 0,
            claves: ["Identificación", "Cursos", "Juego", "Monitoreo de postura"],
            texto: "Imaginemos el recorrido propuesto. Primero, la persona ingresa al sistema y NEXFLOR ID podría ayudar a reconocer si está autorizada. Después, puede recorrer los cursos de NEXFLOR ACADEMY y participar en un juego para comprobar lo aprendido. Durante las labores, NEXFLOR POSTURE podría analizar imágenes de una cámara y emitir un aviso preventivo ante ciertas posturas. La capacitación y el monitoreo postural son funciones diferentes; el diagrama muestra cómo se relacionarían dentro de la plataforma, no un sistema ya validado. A continuación, les explicaré NEXFLOR ID.",
        },
        {
            titulo: "NEXFLOR ID", quien: "Luisa", seg: 45, pasos: 0,
            claves: ["Reconocimiento facial", "Registro", "Privacidad"],
            texto: "El primer módulo es NEXFLOR ID. Su función consiste en utilizar el reconocimiento facial como herramienta para identificar y registrar a las personas autorizadas. La idea es facilitar este proceso mediante tecnología, evitando depender exclusivamente de registros manuales. También debemos considerar que los datos faciales son información sensible, por lo que su tratamiento debe realizarse con las autorizaciones, medidas de seguridad y garantías de privacidad correspondientes. Ahora Alejandro explicará NEXFLOR ACADEMY.",
        },
        {
            titulo: "NEXFLOR ACADEMY", quien: "Alejandro", seg: 45, pasos: 0,
            claves: ["Cursos", "Juego evaluativo", "Retroalimentación"],
            texto: "El segundo módulo es NEXFLOR ACADEMY. La propuesta es que la capacitación sea participativa: las personas podrían recorrer cursos sobre los procedimientos de trabajo y luego responder preguntas o participar en un juego. Así podrían repasar lo aprendido y recibir retroalimentación. La idea es complementar la lectura con actividades interactivas. Ahora Emiliano explicará cómo imaginamos el módulo POSTURE y cuáles son sus límites.",
        },
        {
            titulo: "NEXFLOR POSTURE", quien: "Emiliano", seg: 50, pasos: 0,
            claves: ["Cámara", "Alerta preventiva", "No reemplaza al personal de salud"],
            texto: "NEXFLOR POSTURE propone apoyar la prevención durante las labores. Una cámara y un análisis de imagen podrían señalar algunas posturas de trabajo que convendría revisar y generar una alerta para llamar la atención de la persona. El objetivo sería promover hábitos más seguros y apoyar la salud en el trabajo. Esta visualización es conceptual: no muestra una medición real ni significa que el sistema ya esté construido o validado. Tampoco reemplaza la orientación del personal de salud ni garantiza evitar lesiones. Su utilidad tendría que comprobarse mediante desarrollo, pruebas y una implementación responsable. Ahora les contaré qué aporta la propuesta en conjunto.",
        },
        {
            titulo: "¿Qué aporta NEXFLOR?", quien: "Emiliano", seg: 45, pasos: 0,
            claves: ["Cuatro aportes", "Uso responsable", "Privacidad"],
            texto: "En conjunto, NEXFLOR busca aportar una identificación más organizada, una capacitación participativa y alertas que apoyen la prevención. También propone reunir esas funciones en una plataforma, manteniendo claro que cada módulo atiende una necesidad diferente. Para que una propuesta así pueda ser útil, es fundamental proteger los datos personales, usar las cámaras con responsabilidad y comprobar que cada herramienta funcione como se espera. La innovación no consiste solamente en incorporar tecnología; también implica usarla con un propósito claro, cuidar a las personas y reconocer los límites de lo que todavía debe desarrollarse y validarse.",
        },
        {
            titulo: "Cierre", quien: "Emiliano", seg: 40, pasos: 0,
            claves: ["Eslogan", "Una plataforma", "Preguntas"],
            texto: "Para concluir, NEXFLOR reúne tres ideas: identificar a las personas autorizadas, facilitar el aprendizaje y apoyar la prevención durante el trabajo. Es una propuesta pensada para Flores El Trigal y una oportunidad para seguir aprendiendo, diseñando y evaluando soluciones tecnológicas ante necesidades concretas. Recalcamos que sus visualizaciones son conceptuales y que cualquier implementación tendría que probarse y cuidar la privacidad y el bienestar de las personas. Muchas gracias por su atención. En nombre de Camilo, Luisa, Alejandro y Emiliano, los invitamos a compartir sus preguntas.",
        },
    ],
};
