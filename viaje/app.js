// ========== STORAGE MANAGER ==========
class StorageManager {
    constructor() {
        this.storageKey = 'tuViajeCursoIA';
        this.defaultData = {
            courseProgress: {
                currentLesson: 'intro',
                completedLessons: [],
                unlockedLessons: ['intro']
            },
            userComments: {},
            userActivities: {},
            certificateData: {
                completed: false,
                completionDate: null,
                generatedConclusion: null,
                confettiShown: false
            },
            studentName: '',
            lastAccess: new Date().toISOString()
        };
        this.initializeStorage();
    }
    initializeStorage() {
        const existingData = this.getData();
        if (!existingData) {
            this.saveData(this.defaultData);
        } else {
            existingData.lastAccess = new Date().toISOString();
            this.saveData(existingData);
        }
    }
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al leer datos del localStorage:', error);
            return null;
        }
    }
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error al guardar datos en localStorage:', error);
        }
    }
    getProgress() {
        const data = this.getData();
        return data ? data.courseProgress : this.defaultData.courseProgress;
    }
    updateProgress(progress) {
        const data = this.getData() || this.defaultData;
        data.courseProgress = { ...data.courseProgress, ...progress };
        this.saveData(data);
    }
    completeLesson(lessonId) {
        const data = this.getData() || this.defaultData;
        const progress = data.courseProgress;
        if (!progress.completedLessons.includes(lessonId)) {
            progress.completedLessons.push(lessonId);
        }
        const nextLesson = this.getNextLesson(lessonId);
        if (nextLesson && !progress.unlockedLessons.includes(nextLesson)) {
            progress.unlockedLessons.push(nextLesson);
        }
        progress.currentLesson = nextLesson || lessonId;
        this.saveData(data);
        this.checkCourseCompletion();
    }
    getNextLesson(currentLessonId) {
        const lessonOrder = [
            'intro',
            '1.1', '1.2', '1.3',
            '2.1', '2.2', '2.3',
            '3.1', '3.2', '3.3', '3.4',
            '4.1', '4.2', '4.3',
            '5.1', '5.2', '5.3',
            'certificate'
        ];
        const currentIndex = lessonOrder.indexOf(currentLessonId);
        return currentIndex !== -1 && currentIndex < lessonOrder.length - 1 
            ? lessonOrder[currentIndex + 1] 
            : null;
    }
    isLessonUnlocked(lessonId) {
        const progress = this.getProgress();
        return progress.unlockedLessons.includes(lessonId);
    }
    isLessonCompleted(lessonId) {
        const progress = this.getProgress();
        return progress.completedLessons.includes(lessonId);
    }
    saveComment(lessonId, comment) {
        const data = this.getData() || this.defaultData;
        data.userComments[lessonId] = {
            text: comment,
            timestamp: new Date().toISOString()
        };
        this.saveData(data);
    }
    getComment(lessonId) {
        const data = this.getData();
        return data && data.userComments[lessonId] ? data.userComments[lessonId] : null;
    }
    getAllComments() {
        const data = this.getData();
        return data ? data.userComments : {};
    }
    saveActivity(activityId, response) {
        const data = this.getData() || this.defaultData;
        data.userActivities[activityId] = {
            response: response,
            timestamp: new Date().toISOString()
        };
        this.saveData(data);
    }
    getActivity(activityId) {
        const data = this.getData();
        return data && data.userActivities[activityId] ? data.userActivities[activityId] : null;
    }
    getProgressPercentage() {
        const totalLessons = 17;
        const progress = this.getProgress();
        const completedCount = progress.completedLessons.length;
        return Math.round((completedCount / totalLessons) * 100);
    }
    checkCourseCompletion() {
        const progress = this.getProgress();
        const totalLessons = 17;
        if (progress.completedLessons.length >= totalLessons) {
            const data = this.getData();
            if (!data.certificateData.completed) {
                data.certificateData.completed = true;
                data.certificateData.completionDate = new Date().toISOString();
                if (!progress.unlockedLessons.includes('certificate')) {
                    progress.unlockedLessons.push('certificate');
                }
                this.saveData(data);
                window.dispatchEvent(new CustomEvent('courseCompleted', {
                    detail: { completionDate: data.certificateData.completionDate }
                }));
            }
        }
    }
    saveCertificateConclusion(conclusion) {
        const data = this.getData() || this.defaultData;
        data.certificateData.generatedConclusion = conclusion;
        data.certificateData.conclusionGeneratedAt = new Date().toISOString();
        this.saveData(data);
    }
    getCertificateConclusion() {
        const data = this.getData();
        return data && data.certificateData.generatedConclusion 
            ? data.certificateData.generatedConclusion 
            : null;
    }
    getCertificateData() {
        const data = this.getData();
        return data ? data.certificateData : this.defaultData.certificateData;
    }
    exportData() {
        const data = this.getData();
        return JSON.stringify(data, null, 2);
    }
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.saveData(data);
            return true;
        } catch (error) {
            console.error('Error al importar datos:', error);
            return false;
        }
    }
    resetCourse() {
        if (confirm('¿Estás seguro de que quieres reiniciar TODO el curso? Se borrarán todos tus comentarios, actividades, nombre y progreso. Esta acción no se puede deshacer.')) {
            this.saveData(this.defaultData);
            alert('¡Curso reiniciado! Volviendo a la introducción...');
            window.location.reload();
        }
    }
    getStatistics() {
        const data = this.getData();
        const progress = this.getProgress();
        return {
            totalLessons: 17,
            completedLessons: progress.completedLessons.length,
            progressPercentage: this.getProgressPercentage(),
            totalComments: Object.keys(data.userComments || {}).length,
            totalActivities: Object.keys(data.userActivities || {}).length,
            courseCompleted: data.certificateData.completed,
            completionDate: data.certificateData.completionDate,
            lastAccess: data.lastAccess
        };
    }
    hasComment(lessonId) {
        const comment = this.getComment(lessonId);
        return comment && comment.text && comment.text.trim().length > 0;
    }
    getAllCommentsText() {
        const comments = this.getAllComments();
        const commentTexts = Object.values(comments)
            .map(comment => comment.text)
            .filter(text => text && text.trim().length > 0);
        return commentTexts.join('\n');
    }
}

// ========== COURSE DATA ==========
const courseData = {
    title: "Tu Viaje para Convertirte en un Educador Potenciado por IA",
    description: "Curso interactivo para educadores que desean integrar la Inteligencia Artificial en su práctica docente",
    lessons: {
        intro: {
            id: 'intro',
            title: 'Introducción del Curso',
            subtitle: 'Tu Viaje para Convertirte en un Educador Potenciado por IA',
            module: 'Introducción',
            content: `
                <div class="lesson-intro">
                    <p><strong>¡Bienvenida, bienvenido!</strong> En el corazón de cada educador reside una pasión por encender la curiosidad y guiar el aprendizaje. Sin embargo, las realidades del día a día —la planificación interminable, la carga administrativa y la necesidad de atender a una diversidad de estudiantes— pueden opacar esa llama.</p>
                    <p>Este curso ha sido diseñado pensando en ti. Te presentamos la <strong>Inteligencia Artificial (IA)</strong> no como una tecnología compleja más que aprender, sino como tu nuevo <em>compañero de cátedra</em>: un asistente incansable, un colaborador creativo y una herramienta poderosa para aligerar tu carga y reavivar tu pasión por la enseñanza.</p>
                    <h3>¿Qué lograrás en este viaje?</h3>
                    <p>A lo largo de este viaje, transformarás tu manera de trabajar. Descubrirás cómo:</p>
                    <ul>
                        <li><strong>Ahorrar horas</strong> en tareas administrativas</li>
                        <li><strong>Personalizar el aprendizaje</strong> para que cada estudiante pueda brillar</li>
                        <li><strong>Generar ideas frescas y creativas</strong> para tus clases</li>
                    </ul>
                    <p>Y lo más importante: <strong>no necesitas ninguna experiencia previa</strong>. No hay que saber de codificación ni ser un experto en tecnología para dominar esta habilidad. Solo necesitas curiosidad y el deseo de explorar nuevas fronteras.</p>
                    <h3>Nuestro compromiso contigo</h3>
                    <p>Nuestro compromiso es ofrecerte una experiencia de aprendizaje que sea no solo útil, sino también hermosa, sencilla y profundamente disfrutable. Cada lección está diseñada con un lenguaje claro, apoyada por elementos visuales limpios y actividades prácticas que te darán confianza desde el primer momento.</p>
                    <p>Al finalizar, no solo sabrás cómo usar la IA, sino que te sentirás como un verdadero experto en la creación de prompts, listo para liderar la transformación educativa en tu propia aula.</p>
                    <div class="highlight-box">
                        <p><strong>Nota importante:</strong> Este módulo inicial está cuidadosamente diseñado para eliminar cualquier barrera o temor hacia la tecnología. La percepción de la inteligencia artificial como algo complejo puede ser un obstáculo para educadores ya sobrecargados de trabajo. Por ello, el objetivo aquí es desmitificar la IA, presentándola no como una carga adicional, sino como una solución directa y accesible a los desafíos diarios, construyendo una base de confianza y curiosidad desde el primer momento.</p>
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Comparte tus expectativas sobre este curso y cualquier experiencia previa que tengas con la IA en educación."
        },
        '1.1': {
            id: '1.1',
            title: '¿Qué es la Inteligencia Artificial Generativa?',
            subtitle: 'Explicado con Manzanas',
            module: 'Módulo 1: Fundamentos de la IA Generativa',
            content: `
                <p>La <strong>Inteligencia Artificial Generativa</strong> es una categoría especial de IA que, en lugar de solo procesar datos o seguir instrucciones rígidas, tiene la capacidad de <em>crear contenido completamente nuevo y original</em>. Puede generar textos, componer música, diseñar imágenes y hasta proponer ideas innovadoras.</p>
                <p>Es fundamental entender que <strong>no funciona como un motor de búsqueda tipo Google</strong>, que encuentra información que ya existe en internet. La IA Generativa es una <em>creadora</em>; utiliza su vasto conocimiento para construir respuestas nuevas, palabra por palabra, basándose en los patrones que ha aprendido.</p>
                <h3>La analogía del niño aprendiendo a hablar</h3>
                <p>La mejor manera de entenderlo es a través de una analogía muy familiar para cualquier educador: <strong>un niño aprendiendo a hablar</strong>.</p>
                <p>Imagina un niño pequeño que escucha miles de conversaciones y cuentos. Al principio, solo repite palabras, pero con el tiempo, su cerebro empieza a reconocer patrones: la gramática, el contexto, cómo las palabras se conectan para formar ideas. Eventualmente, el niño no solo repite frases que ha oído, sino que empieza a crear las suyas propias, oraciones nuevas y coherentes para expresar sus pensamientos.</p>
                <h3>Así funciona la IA Generativa</h3>
                <p>La IA Generativa funciona de manera muy similar. Ha sido <strong>«entrenada»</strong> con una cantidad inimaginable de texto e información de internet, el equivalente a lo que un humano tardaría miles de años en leer. A partir de esta exposición masiva, aprende los patrones del lenguaje y, cuando le haces una pregunta, no busca una respuesta preexistente.</p>
                <p>En cambio, <em>predice cuál es la siguiente palabra más lógica</em> para formar una oración coherente y relevante, y luego la siguiente, y la siguiente, construyendo una respuesta original en tiempo real.</p>
            `,
            hasActivity: true,
            activity: {
                type: 'practical',
                title: 'Conoce a tu Asistente',
                description: 'Para tener una primera experiencia tangible y positiva, te invitamos a abrir IABee (el ícono de la abeja a la derecha) y probar con una pregunta sencilla. Esto te permitirá ver la magia en acción.',
                prompt: '¿Puedes explicarme qué es la fotosíntesis como si yo tuviera 10 años y me encantara el béisbol?',
                instruction: 'Observa cómo la IA no solo simplifica el concepto, sino que utiliza analogías relacionadas con el béisbol para hacerlo más cercano y comprensible. Esta es la esencia de tu nuevo asistente.',
                responseField: 'Describe qué pasó cuando probaste este prompt y qué te pareció la respuesta de la IA:'
            },
            hasDiscussion: true,
            discussionPrompt: "¿Qué te pareció la analogía del niño aprendiendo a hablar? ¿Cómo crees que esta comprensión puede cambiar tu perspectiva sobre la IA?"
        },
        '1.2': {
            id: '1.2',
            title: 'El "Superpoder" de la IA en tu Aula',
            subtitle: '¿Por Qué Debería Importarme?',
            module: 'Módulo 1: Fundamentos de la IA Generativa',
            content: `
                <p>La IA Generativa no es solo una novedad tecnológica; es una herramienta con el potencial de <strong>transformar radicalmente la labor docente</strong>, ofreciendo soluciones a algunos de los desafíos más persistentes en educación.</p>
                <p>Estos son los <strong>«superpoderes»</strong> que la IA pone a tu disposición:</p>
                <h3>🚀 Superpoder N.º 1: Ahorro de Tiempo</h3>
                <p>La tarea más valiosa que la IA puede realizar es <strong>devolverte tu tiempo</strong>. Puede automatizar una gran parte de las tareas administrativas que consumen tus días:</p>
                <ul>
                    <li>Redactar correos electrónicos a padres</li>
                    <li>Crear borradores de informes de progreso</li>
                    <li>Calificar evaluaciones de opción múltiple</li>
                    <li>Generar ideas iniciales para la planificación de tus lecciones</li>
                </ul>
                <p>Al delegar estas tareas, liberas horas preciosas que puedes dedicar a lo que ninguna máquina puede hacer: <em>la conexión humana, el apoyo individualizado y la enseñanza inspiradora</em>.</p>
                <h3>🎯 Personalización Masiva del Aprendizaje</h3>
                <p>Cada estudiante es un mundo, con sus propias fortalezas, debilidades y ritmos de aprendizaje. La IA te permite atender esta diversidad de una manera que antes era impensable. Puedes pedirle que:</p>
                <ul>
                    <li><strong>Simplifique un texto complejo</strong> para un estudiante con dificultades de lectura</li>
                    <li><strong>Genere problemas matemáticos adicionales</strong> para quien necesita más práctica</li>
                    <li><strong>Diseñe un desafío de investigación</strong> para un alumno avanzado que ya ha dominado el tema</li>
                </ul>
                <h3>💡 Fomento de la Creatividad y el Compromiso</h3>
                <p>¿Atascado en la misma rutina de actividades? La IA es una <strong>fuente inagotable de inspiración</strong>. Puede ayudarte a:</p>
                <ul>
                    <li>Diseñar debates sobre temas de actualidad</li>
                    <li>Crear actividades de gamificación (ludificación) para hacer el aprendizaje más divertido</li>
                    <li>Proponer ideas para proyectos que conecten los contenidos curriculares con los intereses de tus estudiantes</li>
                </ul>
                <p>Todo esto aumenta la motivación y participación de tus alumnos.</p>
                <h3>📚 Creación de Contenido Ilimitada</h3>
                <p>Imagina poder diseñar <strong>hojas de trabajo, rúbricas de evaluación, presentaciones y planes de lecciones completos</strong> con solo dar unas pocas instrucciones claras.</p>
                <p>La IA puede generar primeros borradores de alta calidad para casi cualquier recurso educativo que necesites, permitiéndote enfocarte en refinar y adaptar el material en lugar de crearlo desde cero.</p>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Cuál de estos 'superpoderes' te resulta más atractivo para tu práctica docente actual? ¿Por qué?"
        },
        '1.3': {
            id: '1.3',
            title: 'Conociendo a tus Asistentes',
            subtitle: 'Gemini, ChatGPT y Claude',
            module: 'Módulo 1: Fundamentos de la IA Generativa',
            content: `
                <p>En el mercado existen varias herramientas de IA Generativa, pero las más populares y accesibles son <strong>Gemini (de Google)</strong>, <strong>ChatGPT (de OpenAI)</strong> y <strong>Claude (de Anthropic)</strong>.</p>
                <p>Aunque cada una tiene sus matices, todas funcionan de la misma manera fundamental: <em>a través de una conversación en lenguaje natural</em>. Para los propósitos de este curso, puedes utilizar cualquiera de ellas, ya que las habilidades que aprenderás son completamente transferibles.</p>
                <h3>Diferencia clave: Acceso a información actual</h3>
                <p>Es útil conocer una diferencia importante:</p>
                <div class="comparison-box">
                    <h4>🌐 Herramientas conectadas a internet</h4>
                    <p><strong>Gemini</strong> y <strong>Microsoft Copilot</strong> (que utiliza la tecnología de OpenAI) suelen estar conectadas a internet en tiempo real, lo que significa que pueden proporcionarte <em>información muy actual</em>.</p>
                    <h4>📚 Herramientas con corte de conocimiento</h4>
                    <p>La versión gratuita de <strong>ChatGPT</strong> tiene un «corte de conocimiento», es decir, su información se limita a los datos con los que fue entrenada hasta una fecha específica (por ejemplo, principios de 2023) y no conoce eventos posteriores.</p>
                </div>
                <h3>Nuestra recomendación</h3>
                <p><strong>No te preocupes por elegir la «mejor» herramienta.</strong> Lo verdaderamente importante es aprender el arte de «conversar» con ellas. Te proporcionaremos los enlaces para que puedas acceder a cada una y experimentar por tu cuenta.</p>
                <div class="tools-links">
                    <h4>Enlaces de acceso:</h4>
                    <ul>
                        <li><strong>ChatGPT:</strong> chat.openai.com</li>
                        <li><strong>Gemini:</strong> gemini.google.com</li>
                        <li><strong>Claude:</strong> claude.ai</li>
                        <li><strong>Microsoft Copilot:</strong> copilot.microsoft.com</li>
                    </ul>
                </div>
                <p>En el próximo módulo, aprenderás exactamente <strong>cómo comunicarte efectivamente</strong> con cualquiera de estas herramientas para obtener los mejores resultados.</p>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Has usado alguna de estas herramientas antes? Si es así, comparte tu experiencia. Si no, ¿cuál te gustaría probar primero y por qué?"
        },
        '2.1': {
            id: '2.1',
            title: '¿Qué es un "Prompt"?',
            subtitle: 'La Semilla de la Creación',
            module: 'Módulo 2: El Arte del Prompting',
            content: `
                <div class="module-intro">
                    <p><strong>Este módulo es el corazón de nuestro curso.</strong> Aquí es donde pasarás de ser un usuario ocasional a un comunicador eficaz y seguro con la inteligencia artificial.</p>
                    <p>Para los docentes que se inician en este mundo, la mayor incertidumbre es <em>no saber qué escribir o cómo pedir las cosas</em>. Para resolver esto, hemos desarrollado una fórmula sencilla y memorable que estructura tus peticiones, garantizando que obtengas resultados útiles y relevantes desde el primer intento.</p>
                </div>
                <h3>Definición de Prompt</h3>
                <p>En el mundo de la IA, un <strong>prompt</strong> es simplemente la instrucción, la pregunta o la frase con la que inicias una conversación. Es la <em>«semilla»</em> que plantas para que la IA genere algo nuevo para ti.</p>
                <p>Puede ser tan simple como:</p>
                <div class="example-box">
                    <p><em>«¿Quién fue Marie Curie?»</em></p>
                </div>
                <p>O tan complejo como una serie de instrucciones detalladas para crear un plan de lección completo.</p>
                <h3>🏆 La Regla de Oro</h3>
                <div class="golden-rule">
                    <p><strong>La calidad de tu prompt determina directamente la calidad de la respuesta.</strong></p>
                </div>
                <h3>Ejemplo comparativo</h3>
                <div class="comparison-examples">
                    <div class="bad-example">
                        <h4>❌ Prompt vago:</h4>
                        <p><em>«Escribe una historia»</em></p>
                        <p><strong>Resultado:</strong> Una historia genérica y poco útil</p>
                    </div>
                    <div class="good-example">
                        <h4>✅ Prompt específico:</h4>
                        <p><em>«Escribe una historia de misterio corta para niños de 10 años, ambientada en un antiguo museo por la noche»</em></p>
                        <p><strong>Resultado:</strong> Una historia rica, personalizada y útil para tus necesidades</p>
                    </div>
                </div>
                <p>Como puedes ver, la diferencia está en la <strong>especificidad y el contexto</strong> que proporcionas. En la siguiente lección, aprenderás una fórmula e
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué te pareció la regla de oro del prompting? ¿Puedes pensar en un ejemplo de un prompt vago que hayas usado y cómo podrías mejorarlo?"
        },
        '2.2': {
            id: '2.2',
            title: 'La Anatomía de un Prompt Perfecto: La Fórmula Mágica',
            subtitle: 'La Fórmula R-C-T-F-E-T',
            module: 'Módulo 2: El Arte del Prompting',
            content: `
                <p>Para eliminar la duda de «qué poner en el prompt», hemos condensado las mejores prácticas en una fórmula fácil de recordar. La llamamos la <strong>Fórmula R-C-T-F-E-T</strong>. Cada letra representa un ingrediente clave que, al combinarse, crea un prompt potente y efectivo. Esta estructura te servirá de guía para cualquier petición que quieras hacerle a la IA.</p>
                <h3>· R – Rol (Persona)</h3>
                <p>Asigna a la IA una identidad o una profesión. Esto enfoca su conocimiento y estilo. En lugar de hablar con una máquina genérica, estás conversando con un experto.</p>
                <div class="example-box">
                    <p><em>Actúa como un experto profesor de historia de secundaria, especializado en hacer la historia atractiva para los adolescentes.</em></p>
                </div>
                <h3>· C – Contexto</h3>
                <p>Dale a la IA la información de fondo que necesita para entender tu situación. ¿Para qué es esto? ¿Para quién es? Cuanto más contexto le des, más relevante será su respuesta.</p>
                <div class="example-box">
                    <p><em>Estoy preparando una lección para mis estudiantes de 5º grado que tienen dificultades para entender el concepto de las fracciones equivalentes.</em></p>
                </div>
                <h3>· T – Tarea</h3>
                <p>Sé absolutamente claro y explícito sobre lo que quieres que la IA haga. Usa verbos de acción.</p>
                <div class="example-box">
                    <p><em>Genera 5 problemas matemáticos del mundo real que requieran el uso de fracciones equivalentes.</em></p>
                </div>
                <h3>· F – Formato</h3>
                <p>Especifica cómo quieres que se presente la respuesta. Esto te ahorra tener que reorganizar la información más tarde.</p>
                <div class="example-box">
                    <p><em>Presenta los problemas en una lista numerada. Después de la lista, crea una tabla con las respuestas y una breve explicación para cada una.</em></p>
                </div>
                <h3>· E – Ejemplos (Few-Shot Prompting)</h3>
                <p>Si tienes un estilo o estructura muy específica en mente, muéstrale a la IA un ejemplo. Esto es increíblemente poderoso para guiarla.</p>
                <div class="example-box">
                    <p><em>Quiero que revises un objetivo de aprendizaje. Por ejemplo, un mal objetivo es: "Los estudiantes aprenderán sobre los planetas". Un buen objetivo es: "Los estudiantes podrán nombrar los ocho planetas del sistema solar en orden desde el Sol". Ahora, revisa este objetivo: "Los estudiantes entenderán la gravedad".</em></p>
                </div>
                <h3>· T – Tono</h3>
                <p>Define el estilo de comunicación que deseas. ¿Debe ser formal, amigable, humorístico, inspirador?</p>
                <div class="example-box">
                    <p><em>Usa un tono alentador y amigable, como si estuvieras hablando directamente con los estudiantes.</em></p>
                </div>
                <div class="highlight-box">
                    <p><strong>Consejo profesional:</strong> No necesitas usar todas las letras en cada prompt. A veces, solo necesitas Rol y Tarea. Otras veces, querrás usarlas todas. La fórmula es una guía, no una camisa de fuerza. ¡Experimenta y encuentra lo que mejor funciona para ti!</p>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Elige una tarea que tengas esta semana (planificar una lección, crear una actividad, escribir un correo) y escribe un prompt usando la fórmula R-C-T-F-E-T. ¡Compártelo con el grupo!"
        },
        '2.3': {
            id: '2.3',
            title: '¡A Practicar! Creando tu Primer Prompt Estructurado',
            subtitle: 'Pon en práctica la fórmula',
            module: 'Módulo 2: El Arte del Prompting',
            content: `
                <p>Ahora, pongamos en práctica la fórmula R-C-T-F-E-T con un escenario real.</p>
                <h3>Escenario:</h3>
                <p>Necesitas una actividad corta y divertida para introducir el ciclo del agua a tu clase de 3er grado.</p>
                <h3>Vamos a construir el prompt juntos, paso a paso:</h3>
                <ol>
                    <li><strong>Rol:</strong> Actúa como un profesor de ciencias de primaria experto en hacer que el aprendizaje sea divertido.</li>
                    <li><strong>Contexto:</strong> Estoy preparando mi próxima clase para estudiantes de 3er grado (8-9 años). Necesito una actividad de "gancho" de no más de 5 minutos para despertar su curiosidad sobre el ciclo del agua antes de empezar la lección principal.</li>
                    <li><strong>Tarea:</strong> Genera una idea para una actividad de introducción o un experimento muy simple y visual.</li>
                    <li><strong>Formato:</strong> Describe la actividad en 3 pasos sencillos que pueda seguir en el aula. Lista los materiales necesarios (deben ser cosas comunes como agua, un vaso o una bolsa de plástico).</li>
                    <li><strong>Tono:</strong> Escribe con un lenguaje entusiasta y muy fácil de entender para niños.</li>
                </ol>
                <div class="prompt-box">
                    <h4>Prompt Completo:</h4>
                    <div class="prompt-content">
                        Actúa como un profesor de ciencias de primaria experto en hacer que el aprendizaje sea divertido. Estoy preparando mi próxima clase para estudiantes de 3er grado (8-9 años). Necesito una actividad de "gancho" de no más de 5 minutos para despertar su curiosidad sobre el ciclo del agua antes de empezar la lección principal. Genera una idea para una actividad de introducción o un experimento muy simple y visual. Describe la actividad en 3 pasos sencillos que pueda seguir en el aula. Lista los materiales necesarios (deben ser cosas comunes como agua, un vaso o una bolsa de plástico). Escribe con un lenguaje entusiasta y muy fácil de entender para niños.
                    </div>
                </div>
                <h3>Tu Turno:</h3>
                <p>Copia este prompt, pégalo en tu herramienta de IA preferida y observa el resultado. Experimenta cambiando alguna de las partes. ¿Qué pasa si cambias el tono a «muy científico»? ¿O el rol a «un explorador de la selva»? ¡La experimentación es clave!</p>
                <div class="highlight-box">
                    <p><strong>Tabla de Referencia Rápida: La Fórmula R-C-T-F-E-T</strong><br>
                    Para ayudarte a interiorizar esta estructura, aquí tienes una tabla de referencia. Puedes imprimirla y tenerla a mano mientras practicas. Esta herramienta visual sirve como un andamio práctico, reduciendo la carga cognitiva y acelerando tu confianza y fluidez al crear prompts.</p>
                </div>
            `,
            hasActivity: true,
            activity: {
                type: 'practical',
                title: 'Crea tu propio prompt',
                description: 'Ahora es tu turno de crear un prompt usando la fórmula R-C-T-F-E-T.',
                instruction: 'Piensa en una tarea que necesites hacer esta semana y crea un prompt estructurado. Copia y pega el resultado en el campo de abajo.',
                responseField: 'Pega aquí tu prompt estructurado:'
            },
            hasDiscussion: true,
            discussionPrompt: "Comparte tu prompt con el grupo. ¿Qué parte de la fórmula te resultó más útil? ¿Qué parte te costó más?"
        },
        '3.1': {
            id: '3.1',
            title: 'Planificación de Clases en Minutos',
            subtitle: 'Ahorra horas en la creación de planes de lección',
            module: 'Módulo 3: Plantillas Prácticas',
            content: `
                <p>Con los fundamentos del prompting ya establecidos, este módulo se convierte en tu biblioteca de «recetas» prácticas. Aquí encontrarás plantillas listas para copiar, pegar y adaptar a tus necesidades diarias. El verdadero poder transformador de la IA para los educadores no reside en generar un único recurso perfecto, sino en su asombrosa capacidad para crear variaciones de ese recurso de forma casi instantánea. La habilidad más valiosa que aprenderás aquí no es solo «cómo crear una hoja de trabajo», sino «cómo crear una y, con un simple prompt de seguimiento, obtener al instante una versión más fácil, una más difícil, una en formato de juego y otra traducida para tus estudiantes bilingües». Este es el cambio de paradigma que la IA trae a la diferenciación y la planificación.</p>
                <h3>Plantilla para Plan de Lección (Modelo 5E)</h3>
                <p>Este prompt te ayudará a generar un plan de lección estructurado y completo, ideal para ciencias pero adaptable a cualquier materia.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un diseñador curricular experto y un profesor veterano. Crea un plan de lección detallado de [duración] para mi clase de [Asignatura] de [Nivel/Grado] sobre el tema de [tema específico].<br><br>
                        Utiliza el modelo pedagógico de las 5E (Enganchar, Explorar, Explicar, Elaborar, Evaluar).<br><br>
                        Los objetivos de aprendizaje para esta lección son:<br>
                        - [Objetivo de aprendizaje 1]<br>
                        - [Objetivo de aprendizaje 2]<br><br>
                        El plan de lección debe incluir:<br>
                        1. Una actividad creativa para la fase de "Enganchar".<br>
                        2. Una actividad práctica o de indagación para la fase de "Explorar".<br>
                        3. Los puntos clave y vocabulario a cubrir en la fase de "Explicar".<br>
                        4. Una tarea de aplicación o extensión para la fase de "Elaborar".<br>
                        5. Una idea de evaluación formativa (como un ticket de salida) para la fase de "Evaluar".<br>
                        6. Una sección de "Diferenciación" con sugerencias para apoyar a [tipo de estudiantes, ej: estudiantes con dificultades, estudiantes avanzados, estudiantes ELL].
                    </div>
                </div>
                <h3>Plantilla para Objetivos de Aprendizaje (SMART)</h3>
                <p>Genera objetivos claros, medibles y alcanzables para guiar tu enseñanza y la evaluación de los estudiantes.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un especialista en pedagogía. Genera 3 objetivos de aprendizaje que sigan el formato SMART (Específicos, Medibles, Alcanzables, Relevantes, con Plazo) para una unidad sobre [tema de la unidad] para estudiantes de [Nivel/Grado].
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué plantilla te resultó más útil? ¿Cómo planeas adaptarla para tu contexto específico?"
        },
        '3.2': {
            id: '3.2',
            title: 'Fábrica de Recursos Educativos',
            subtitle: 'Crea materiales personalizados en minutos',
            module: 'Módulo 3: Plantillas Prácticas',
            content: `
                <p>Crea materiales personalizados en una fracción del tiempo que te llevaría hacerlo manualmente.</p>
                <h3>Plantilla para Hojas de Trabajo (Worksheets)</h3>
                <p>Genera ejercicios variados para practicar y reforzar conceptos.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Crea una hoja de trabajo para mi clase de [Asignatura] de [Nivel/Grado] sobre el tema [tema específico]. La hoja de trabajo debe incluir 3 secciones:<br>
                        1. [Número] ejercicios de [tipo de ejercicio, ej: completar oraciones, verdadero/falso].<br>
                        2. [Número] preguntas de [tipo de pregunta, ej: opción múltiple, emparejamiento].<br>
                        3. [Número] pregunta de [tipo de pregunta, ej: respuesta abierta, ensayo corto].<br><br>
                        Al final, incluye una hoja de respuestas completa.
                    </div>
                </div>
                <h3>Plantilla para Textos de Comprensión Lectora</h3>
                <p>Diseña textos adaptados al nivel de tus estudiantes con preguntas que evalúen su comprensión.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Escribe un pasaje de lectura de aproximadamente [Número de palabras] palabras sobre [tema]. El texto debe ser apropiado para un nivel de lectura de [Nivel/Grado].<br><br>
                        Después del pasaje, crea 5 preguntas de comprensión lectora:<br>
                        - 3 preguntas literales (la respuesta está directamente en el texto).<br>
                        - 2 preguntas inferenciales (la respuesta requiere pensar más allá del texto).<br><br>
                        Proporciona también las respuestas a las preguntas.
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué tipo de recurso educativo te lleva más tiempo crear normalmente? ¿Cómo podrías usar la IA para agilizar ese proceso?"
        },
        '3.3': {
            id: '3.3',
            title: 'Atención a la Diversidad: Prompts para Diferenciar la Enseñanza',
            subtitle: 'Adapta materiales para todos tus estudiantes',
            module: 'Módulo 3: Plantillas Prácticas',
            content: `
                <p>Esta es una de las aplicaciones más poderosas de la IA. Atiende las necesidades individuales de cada estudiante con materiales adaptados.</p>
                <h3>Plantilla para Adaptar la Complejidad de un Texto</h3>
                <p>Haz que cualquier texto sea accesible para todos tus estudiantes.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un experto en diferenciación educativa. Toma el siguiente texto y reescríbelo en tres niveles de complejidad diferentes para una clase de [Nivel/Grado]:<br>
                        1. Nivel Básico: Simplifica el vocabulario y la estructura de las oraciones para estudiantes con dificultades de lectura.<br>
                        2. Nivel Intermedio: Mantén el texto al nivel del grado correspondiente.<br>
                        3. Nivel Avanzado: Aumenta la complejidad del vocabulario y añade detalles para desafiar a los estudiantes más avanzados.<br><br>
                        El texto original es:<br>
                        "[Pega aquí el texto que quieres adaptar]"
                    </div>
                </div>
                <h3>Plantilla para Actividades por Niveles (Tiered Activities)</h3>
                <p>Diseña diferentes caminos para que los estudiantes alcancen el mismo objetivo de aprendizaje.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un especialista en educación inclusiva. Para mi lección sobre [tema de la lección], diseña un conjunto de 3 actividades por niveles (tiered activities) para que los estudiantes demuestren su comprensión. Todas las actividades deben apuntar al mismo objetivo de aprendizaje, pero variar en complejidad.<br><br>
                        - Actividad Básica (para estudiantes que necesitan más apoyo): [Describe brevemente].<br>
                        - Actividad Intermedia (para la mayoría de los estudiantes): [Describe brevemente].<br>
                        - Actividad Avanzada (para estudiantes que necesitan un desafío): [Describe brevemente].
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Cómo podrías usar estas plantillas para atender a un estudiante específico en tu clase que tiene necesidades particulares?"
        },
        '3.4': {
            id: '3.4',
            title: 'Evaluaciones y Rúbricas Justas y Claras',
            subtitle: 'Crea herramientas de evaluación transparentes',
            module: 'Módulo 3: Plantillas Prácticas',
            content: `
                <p>Crea herramientas de evaluación que sean transparentes para los estudiantes y eficientes para ti.</p>
                <h3>Plantilla para Crear Rúbricas</h3>
                <p>Define claramente los criterios de éxito para cualquier tarea o proyecto.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Crea una rúbrica de evaluación para un [tipo de tarea, ej: ensayo, presentación, proyecto] sobre [tema] para mi clase de [Nivel/Grado].<br><br>
                        La rúbrica debe estar en formato de tabla y evaluar los siguientes criterios:<br>
                        - [Criterio 1, ej: Claridad del argumento]<br>
                        - [Criterio 2, ej: Uso de evidencia]<br>
                        - [Criterio 3, ej: Organización y estructura]<br>
                        - [Criterio 4, ej: Gramática y estilo]<br><br>
                        Para cada criterio, describe los 4 niveles de desempeño: Sobresaliente, Satisfactorio, En Desarrollo y Necesita Mejorar.
                    </div>
                </div>
                <h3>Plantilla para Generar Feedback para Estudiantes</h3>
                <p>Ofrece comentarios constructivos y personalizados de manera rápida y consistente.</p>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un tutor de escritura alentador y constructivo. Revisa el siguiente borrador de un estudiante de [Nivel/Grado] y proporciona feedback.<br><br>
                        El objetivo de la tarea era [describe brevemente el objetivo de la tarea].<br><br>
                        El borrador del estudiante es:<br>
                        "[Pega aquí el texto del estudiante]"<br><br>
                        Proporciona el feedback siguiendo el modelo "Glow and Grow":<br>
                        - Glow (Brillo): Empieza identificando 1 o 2 aspectos positivos específicos del texto.<br>
                        - Grow (Crecimiento): Ofrece 1 o 2 sugerencias de mejora que sean claras, específicas y accionables.<br><br>
                        El tono del feedback debe ser motivador y respetuoso.
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué aspecto de la evaluación te consume más tiempo? ¿Cómo podría la IA ayudarte a ser más eficiente sin sacrificar la calidad del feedback?"
        },
        '4.1': {
            id: '4.1',
            title: 'El Poder de la Iteración: Cómo "Conversar" para Perfeccionar',
            subtitle: 'Refina tus resultados con prompts de seguimiento',
            module: 'Módulo 4: Técnicas Avanzadas',
            content: `
                <p>Un error común entre los principiantes es aceptar la primera respuesta de la IA como la definitiva. Los usuarios expertos, en cambio, saben que la primera respuesta es solo el punto de partida de una conversación. El verdadero dominio del prompting reside en la <strong>iteración</strong>: el arte de refinar y moldear la respuesta de la IA a través de una serie de prompts de seguimiento.</p>
                <h3>Concepto Clave:</h3>
                <p>Piensa en la IA como un aprendiz entusiasta. Le has dado una instrucción inicial, y te ha traído un primer borrador. Ahora, como un buen mentor, tu trabajo es guiarla hacia el resultado perfecto.</p>
                <h3>Técnicas de Refinamiento:</h3>
                <p>Después de recibir una respuesta inicial, utiliza frases cortas y directas para ajustarla:</p>
                <ul>
                    <li>"Eso está muy bien, pero hazlo más corto y en formato de viñetas."</li>
                    <li>"Ahora, añade un ejemplo del mundo real que un adolescente pueda entender."</li>
                    <li>"Explica el tercer paso con más detalle."</li>
                    <li>"Excelente. Ahora reformula todo con un tono más formal, como para un correo a un director de escuela."</li>
                    <li>"¿Puedes añadir una cita de un experto en el tema?"</li>
                </ul>
                <div class="practical-activity">
                    <h4>Actividad Práctica «Puliendo el Diamante»:</h4>
                    <ol>
                        <li>Elige una de las plantillas del Módulo 3 y genera una respuesta inicial (por ejemplo, un plan de lección).</li>
                        <li>Ahora, desafíate a ti mismo a mejorar ese resultado con al menos tres prompts de seguimiento.</li>
                        <li><strong>Ejemplo:</strong>
                            <ul>
                                <li><strong>Prompt Inicial:</strong> (Usando la plantilla de plan de lección).</li>
                                <li><strong>Respuesta de la IA:</strong> (Genera un plan de lección).</li>
                                <li><strong>Seguimiento 1:</strong> "Convierte la actividad de 'Elaborar' en un juego de roles para grupos de 4 estudiantes."</li>
                                <li><strong>Seguimiento 2:</strong> "Crea una lista de 5 preguntas abiertas para la discusión en la fase de 'Evaluar'."</li>
                                <li><strong>Seguimiento 3:</strong> "Resume todo el plan de lección en una tabla concisa que pueda compartir con mi colega."</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Comparte un ejemplo de cómo usaste la iteración para mejorar un resultado de la IA. ¿Qué estrategia de refinamiento funcionó mejor para ti?"
        },
        '4.2': {
            id: '4.2',
            title: 'Pensamiento "Paso a Paso" (Chain-of-Thought)',
            subtitle: 'Mejora la precisión en tareas complejas',
            module: 'Módulo 4: Técnicas Avanzadas',
            content: `
                <p>A veces, cuando le planteas a la IA un problema que requiere varios pasos de razonamiento (como un problema matemático o una pregunta de lógica compleja), puede que se apresure a dar una respuesta y cometa un error. La técnica de <strong>Cadena de Pensamiento (Chain-of-Thought o CoT)</strong> es una forma increíblemente simple y efectiva de evitar esto.</p>
                <h3>Explicación Sencilla:</h3>
                <p>Es como decirle a un estudiante: «No me des solo la respuesta final, muéstrame tu trabajo». Al forzar a la IA a articular su proceso de razonamiento paso a paso, a menudo mejora su precisión y te permite ver exactamente cómo llegó a la conclusión.</p>
                <h3>Cómo Activarla:</h3>
                <p>La forma más fácil de activar la Cadena de Pensamiento es simplemente añadiendo una frase mágica al final de tu prompt:</p>
                <ul>
                    <li>"... Pensemos paso a paso."</li>
                    <li>"... Explica tu razonamiento."</li>
                </ul>
                <h3>Caso de Uso para Docentes:</h3>
                <p>Esta técnica es ideal para:</p>
                <ul>
                    <li>Generar explicaciones claras y lógicas de conceptos científicos o matemáticos que los estudiantes puedan seguir.</li>
                    <li>Resolver problemas de lógica o de palabras, mostrando cada etapa del proceso.</li>
                    <li>Verificar el razonamiento de la IA antes de confiar en su respuesta.</li>
                </ul>
                <h3>Ejemplo Práctico:</h3>
                <div class="comparison-examples">
                    <div class="bad-example">
                        <h4>❌ Prompt sin CoT:</h4>
                        <p><em>Un agricultor tiene 15 ovejas. Vende 7 y luego compra 5 más. ¿Cuántas ovejas tiene al final?</em></p>
                        <p><strong>Respuesta posible (y a veces incorrecta):</strong> 13 ovejas.</p>
                    </div>
                    <div class="good-example">
                        <h4>✅ Prompt con CoT:</h4>
                        <p><em>Un agricultor tiene 15 ovejas. Vende 7 y luego compra 5 más. ¿Cuántas ovejas tiene al final? **Pensemos paso a paso.**</em></p>
                        <p><strong>Respuesta esperada:</strong></p>
                        <ol>
                            <li>El agricultor comienza con 15 ovejas.</li>
                            <li>Vende 7 ovejas, así que calculamos 15 - 7 = 8 ovejas.</li>
                            <li>Luego, compra 5 ovejas más, así que calculamos 8 + 5 = 13 ovejas.</li>
                            <li>Por lo tanto, el agricultor tiene 13 ovejas al final.</li>
                        </ol>
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Prueba la técnica de Cadena de Pensamiento con un problema que hayas tenido que explicar recientemente a tus estudiantes. ¿Cómo cambió la respuesta de la IA?"
        },
        '4.3': {
            id: '4.3',
            title: 'Creando tus Propias Plantillas Reutilizables',
            subtitle: 'Automatiza tus tareas recurrentes',
            module: 'Módulo 4: Técnicas Avanzadas',
            content: `
                <p>Este es el paso final para convertirte en un verdadero experto: pasar de usar plantillas a crear las tuyas. Si te encuentras pidiendo a la IA el mismo tipo de tarea repetidamente, puedes crear tu propia plantilla reutilizable. Esto no solo te ahorra tiempo, sino que también te permite estandarizar la calidad de los resultados que obtienes.</p>
                <h3>La Técnica:</h3>
                <p>La forma más sencilla de crear una plantilla es escribir tu prompt ideal y usar <strong>corchetes [ ]</strong> para marcar las partes que cambiarán cada vez que lo uses. Estas partes entre corchetes son tus «variables».</p>
                <h3>Ejemplo de Plantilla Personalizada para el Docente:</h3>
                <div class="prompt-box">
                    <div class="prompt-content">
                        Actúa como un [tipo de experto, ej: especialista en literatura, coach de escritura] con experiencia en [área específica, ej: fomentar el pensamiento crítico, mejorar la gramática].<br><br>
                        Crea una lista de [Número] preguntas de debate para mi clase de [Nivel/Grado] sobre nuestra unidad actual de [tema de la unidad].<br><br>
                        Las preguntas deben ser abiertas, polémicas y conectar el tema con [Asunto de actualidad o interés de los estudiantes, ej: el uso de las redes sociales, la justicia social].<br><br>
                        El formato de la salida debe ser una lista numerada.
                    </div>
                </div>
                <div class="practical-activity">
                    <h4>Actividad «Crea tu Plantilla»:</h4>
                    <ol>
                        <li>Piensa en una tarea que realices con frecuencia en tu trabajo (por ejemplo, escribir comentarios para los boletines de notas, crear actividades de calentamiento, redactar correos electrónicos a los padres sobre un tema específico).</li>
                        <li>Diseña tu propia plantilla reutilizable usando la estructura anterior. Identifica las variables que cambiarán cada vez y márcalas con [ ].</li>
                        <li>Guarda tu plantilla en un documento para tenerla siempre a mano. ¡Acabas de crear tu propia herramienta de IA personalizada!</li>
                    </ol>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Comparte tu plantilla personalizada con el grupo. ¿Qué tarea recurrente decidiste automatizar? ¿Cómo crees que esto impactará tu flujo de trabajo?"
        },
        '5.1': {
            id: '5.1',
            title: 'Protegiendo la Privacidad de tus Estudiantes (y la Tuya)',
            subtitle: 'Guía práctica para el uso seguro',
            module: 'Módulo 5: Uso Ético y Responsable',
            content: `
                <p>La privacidad de los datos es la consideración ética y legal más importante al usar herramientas de IA. La regla de oro es simple e innegociable:</p>
                <div class="highlight-box">
                    <p><strong>Nunca introduzcas información personal o identificable de los estudiantes en herramientas de IA públicas y gratuitas.</strong></p>
                </div>
                <p>Esto incluye nombres completos, fechas de nacimiento, direcciones, calificaciones específicas, detalles de comportamiento, o cualquier texto escrito por un estudiante que pueda revelar su identidad. Las herramientas públicas pueden usar los datos que introduces para entrenar sus modelos, lo que significa que esa información podría quedar expuesta.</p>
                <h3>Guía Práctica para el Uso Seguro:</h3>
                <p>El principio clave es la <strong>anonimización</strong>. Siempre debes convertir la información específica en una descripción genérica.</p>
                <div class="comparison-examples">
                    <div class="bad-example">
                        <h4>❌ En lugar de:</h4>
                        <p><em>"Genera un plan de intervención para Juan Pérez, un estudiante de 4º grado en mi clase que tiene dificultades con la resta de dos dígitos y muestra signos de discalculia."</em></p>
                    </div>
                    <div class="good-example">
                        <h4>✅ Usa:</h4>
                        <p><em>"Actúa como un especialista en educación especial. Genera un plan de intervención con 3 estrategias para un estudiante de 4º grado que presenta dificultades persistentes con la resta de dos dígitos y podría tener discalculia."</em></p>
                    </div>
                </div>
                <p>De esta manera, obtienes la ayuda que necesitas sin comprometer la privacidad de nadie.</p>
                <h3>Tabla Clave: Chequeo Rápido de Privacidad</h3>
                <p>Las leyes de privacidad como FERPA (en EE. UU.) y otras regulaciones locales son complejas. Para simplificar, utiliza esta lista de verificación antes de usar una herramienta de IA. Traduce la complejidad legal en acciones prácticas y te capacita para tomar decisiones seguras sin necesidad de ser un experto en leyes.</p>
                <table style="width:100%; border-collapse: collapse; margin: 1.5rem 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: var(--primary-blue); color: white;">
                            <th style="padding: 1rem; text-align: left;">Pregunta de Verificación</th>
                            <th style="padding: 1rem; text-align: left;">Acción Recomendada (Si la respuesta es SÍ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¿Estoy incluyendo el nombre o apellido de un estudiante?</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¡DETENTE! Usa un seudónimo como «Estudiante A» o describe el perfil de forma genérica.</td>
                        </tr>
                        <tr>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¿Estoy incluyendo calificaciones o datos de rendimiento específicos de un estudiante identificable?</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¡DETENTE! Describe la situación en términos generales. Ejemplo: «un estudiante con un rendimiento bajo en comprensión lectora».</td>
                        </tr>
                        <tr>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¿Estoy pegando un trabajo completo de un estudiante que podría contener información personal?</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">¡DETENTE! Pega solo fragmentos relevantes y asegúrate de que no contengan datos personales.</td>
                        </tr>
                        <tr>
                            <td style="padding: 1rem;">¿Estoy utilizando una herramienta de IA que no ha sido aprobada por mi escuela o distrito?</td>
                            <td style="padding: 1rem;">¡PRECAUCIÓN! Prioriza el uso de herramientas que tu institución haya verificado y considere seguras.</td>
                        </tr>
                    </tbody>
                </table>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué protocolos de privacidad tienes actualmente en tu institución? ¿Cómo se alinean con las recomendaciones de este módulo?"
        },
        '5.2': {
            id: '5.2',
            title: 'Identificando y Evitando el Sesgo en la IA',
            subtitle: 'Tu rol como editor crítico',
            module: 'Módulo 5: Uso Ético y Responsable',
            content: `
                <p>La inteligencia artificial aprende de la ingente cantidad de datos disponibles en internet. Desafortunadamente, esos datos reflejan los sesgos, prejuicios y estereotipos presentes en nuestra sociedad. Como resultado, la IA puede, sin querer, generar respuestas que perpetúen estas ideas injustas.</p>
                <h3>Ejemplo Práctico y Relevante:</h3>
                <p>Un estudio demostró que los detectores de plagio por IA a menudo clasificaban incorrectamente los textos escritos por hablantes no nativos de inglés como «generados por IA». Esto ocurría porque sus sistemas estaban entrenados para asociar la escritura «humana» con un lenguaje más complejo y variado, penalizando así a quienes escriben de forma más simple y directa. Esto podría llevar a acusaciones injustas de trampa contra estudiantes que ya enfrentan barreras lingüísticas.</p>
                <h3>Estrategia para Docentes: El Rol del «Editor Crítico»</h3>
                <p>Tu papel es fundamental para mitigar este riesgo. Nunca aceptes el contenido generado por la IA como una verdad absoluta. Trátalo siempre como un <strong>primer borrador</strong> que necesita tu revisión experta. Al revisar un texto o una idea generada por la IA, pregúntate:</p>
                <ul>
                    <li>¿Representa este contenido una diversidad de perspectivas o solo una visión dominante?</li>
                    <li>¿Podría esta imagen o descripción reforzar algún estereotipo de género, raza o cultura?</li>
                    <li>¿La información es objetiva y está equilibrada?</li>
                </ul>
                <p>Tu juicio profesional y tu conocimiento de tus estudiantes son insustituibles. Usa la IA para acelerar el trabajo, pero reserva para ti la decisión final sobre la calidad y la idoneidad del contenido.</p>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Has detectado algún sesgo en los materiales generados por IA? ¿Cómo lo abordaste? Comparte tus estrategias con el grupo."
        },
        '5.3': {
            id: '5.3',
            title: 'Fomentando la Integridad Académica en la Era de la IA',
            subtitle: 'Enseña a usar la IA de manera ética',
            module: 'Módulo 5: Uso Ético y Responsable',
            content: `
                <p>La preocupación más extendida entre los educadores es que los estudiantes usen la IA para hacer trampa o plagiar. Si bien este es un riesgo real, la prohibición total rara vez es una solución efectiva a largo plazo. Un enfoque más poderoso es enseñar a los estudiantes a usar la IA de manera ética y responsable.</p>
                <h3>Cambio de Enfoque: La IA como «Calculadora para la Escritura»</h3>
                <p>Podemos posicionar la IA como una herramienta de apoyo, similar a cómo usamos una calculadora en matemáticas. La calculadora nos ayuda con los cálculos pesados, pero no hace el razonamiento por nosotros; todavía necesitamos saber qué problema resolver y cómo interpretar el resultado. De la misma manera, la IA puede ayudar a organizar ideas, mejorar la gramática o sugerir estructuras, pero el pensamiento crítico, la originalidad y la voz personal deben seguir siendo del estudiante.</p>
                <h3>Estrategias para Diseñar Tareas «a Prueba de IA» (AI-Proofing):</h3>
                <p>La clave es diseñar evaluaciones que requieran habilidades que la IA no posee. La IA es excelente para resumir información, pero deficiente para la reflexión personal, la creatividad genuina y la aplicación en contextos específicos del mundo real.</p>
                <div class="comparison-examples">
                    <div class="bad-example">
                        <h4>❌ En lugar de:</h4>
                        <p><em>"Escribe un ensayo de 500 palabras sobre las causas de la Primera Guerra Mundial."</em> (Una tarea que la IA puede completar en segundos).</p>
                    </div>
                    <div class="good-example">
                        <h4>✅ Prueba con:</h4>
                        <p><em>"Imagina que eres un joven soldado en las trincheras en 1916. Escribe una carta a tu familia describiendo tus experiencias y sentimientos. En la carta, debes hacer referencia a al menos dos de las causas principales de la guerra que hemos estudiado en clase."</em></p>
                        <p>Este segundo prompt requiere empatía, perspectiva personal y la conexión de conocimientos específicos de la clase, habilidades que van más allá de la capacidad actual de la IA. Fomenta el pensamiento de orden superior y mantiene la integridad académica.</p>
                    </div>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "Comparte una tarea que hayas rediseñado (o que planees rediseñar) para ser 'a prueba de IA'. ¿Qué habilidades de orden superior estás evaluando con esta nueva versión?"
        },
        certificate: {
            id: 'certificate',
            title: '¡Felicidades! Has completado el curso',
            subtitle: 'Resumen del Viaje y Certificado',
            module: 'Certificado y Conclusión',
            content: `
                <div class="certificate-content">
                    <h2><i class="fas fa-graduation-cap"></i> ¡Felicidades!</h2>
                    <p>Has completado un viaje intensivo desde los fundamentos de la inteligencia artificial hasta las técnicas avanzadas de prompting. Ya no eres un espectador de esta tecnología, sino un participante activo y capacitado. A lo largo de este curso, has aprendido a desmitificar la IA, a conversar con ella de manera efectiva usando la fórmula R-C-T-F-E-T, a crear recursos educativos personalizados en minutos y, lo más importante, a navegar este nuevo territorio con una brújula ética y responsable.</p>
                    <p>Ahora posees las habilidades para transformar tu práctica docente, liberar tiempo valioso y crear experiencias de aprendizaje más ricas y atractivas para tus estudiantes. Para reconocer tu dedicación y el dominio de estas nuevas competencias, te otorgamos un <strong><a href="#" onclick="Navigation.showCertificate(); return false;" style="color: #d4af37; text-decoration: underline;">Certificado Oficial de Finalización</a></strong>. ¡Muéstralo con orgullo!</p>
                    <div style="text-align: center; margin: 2rem 0;">
                        <a href="BibliotecaRapidaPromptsEducadores.pdf" download class="btn btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
                            <i class="fas fa-download"></i> Biblioteca de Prompts
                        </a>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                            (Archivo: BibliotecaRapidaPromptsEducadores.pdf)
                        </p>
                    </div>
                    <h3>Glosario de Términos Clave (en Lenguaje Sencillo)</h3>
                    <ul>
                        <li><strong>Inteligencia Artificial (IA) Generativa:</strong> Un tipo de IA que puede crear contenido nuevo (texto, imágenes, etc.) en lugar de solo analizar datos existentes.</li>
                        <li><strong>LLM (Large Language Model / Gran Modelo de Lenguaje):</strong> El «cerebro» detrás de herramientas como ChatGPT. Es un modelo entrenado con enormes cantidades de texto para entender y generar lenguaje humano.</li>
                        <li><strong>Prompt:</strong> La instrucción, pregunta o texto que le das a la IA para que realice una tarea.</li>
                        <li><strong>Alucinación:</strong> Un término para describir cuando una IA genera información que es incorrecta, inventada o que no tiene sentido, pero la presenta con total confianza. Siempre es crucial verificar la información importante.</li>
                        <li><strong>Sesgo (Bias):</strong> Una tendencia en los resultados de la IA a favorecer ciertas perspectivas o a generar resultados injustos, debido a los sesgos presentes en los datos con los que fue entrenada.</li>
                        <li><strong>Iteración:</strong> El proceso de refinar la respuesta de la IA a través de una conversación con múltiples prompts de seguimiento.</li>
                        <li><strong>Chain-of-Thought (Cadena de Pensamiento):</strong> Una técnica de prompting que consiste en pedir a la IA que explique su razonamiento «paso a paso» para mejorar la precisión en tareas complejas.</li>
                    </ul>
                    <h3>Recursos Visuales y Herramientas Recomendadas</h3>
                    <p>Para que tus materiales educativos no solo sean efectivos, sino también visualmente atractivos y «hermosos», te recomendamos explorar estos recursos. Muchos de ellos ofrecen íconos y gráficos gratuitos o bajo licencias Creative Commons, que te permiten usarlos legalmente en tus proyectos educativos, a menudo solo con dar crédito al autor.</p>
                    <ul>
                        <li><strong>Bancos de Íconos:</strong>
                            <ul>
                                <li><strong>Flaticon:</strong> Ofrece una enorme biblioteca de íconos en diversos estilos. La versión gratuita requiere atribución.</li>
                                <li><strong>The Noun Project:</strong> Ideal para encontrar íconos simples y claros para casi cualquier concepto imaginable.</li>
                                <li><strong>Icons8:</strong> Proporciona íconos consistentes en múltiples estilos, lo que es genial para mantener una identidad visual unificada.</li>
                            </ul>
                        </li>
                        <li><strong>Bancos de Imágenes y Gráficos (con licencias amigables para la educación):</strong>
                            <ul>
                                <li><strong>Creative Commons Search (ahora Openverse):</strong> Un motor de búsqueda que te permite encontrar imágenes, audio y más contenido con licencias CC, listo para ser usado y remezclado.</li>
                                <li><strong>Freepik:</strong> Ofrece una gran variedad de vectores, fotos y plantillas. Tiene opciones gratuitas con atribución.</li>
                                <li><strong>Canva:</strong> Una herramienta de diseño muy intuitiva que incluye una vasta biblioteca de elementos gráficos, muchos de ellos gratuitos, perfecta para crear presentaciones, hojas de trabajo y más.</li>
                            </ul>
                        </li>
                    </ul>
                    <p>Recuerda siempre revisar los términos de la licencia de cualquier recurso visual que utilices para asegurarte de que cumples con los requisitos de atribución. ¡Ahora tienes todo lo que necesitas para empezar a crear!</p>
                </div>
            `,
            hasDiscussion: true,
            discussionPrompt: "¿Qué es lo primero que vas a implementar en tu aula con lo aprendido en este curso? ¿Qué impacto esperas que tenga?"
        }
    }
};

// ========== LESSON RENDERER ==========
class LessonRenderer {
    static renderLesson(lessonId) {
        const lesson = courseData.lessons[lessonId];
        if (!lesson) {
            document.getElementById('lessonContent').innerHTML = '<p>Lección no encontrada.</p>';
            return;
        }
        let html = `
            <div class="lesson">
                <div class="lesson-header">
                    <h1 class="lesson-title">${lesson.title}</h1>
                    <h2 class="lesson-subtitle">${lesson.subtitle}</h2>
                </div>
                <div class="lesson-content">
                    ${lesson.content}
                </div>
        `;
        // Add discussion box if exists
        if (lesson.hasDiscussion) {
            const savedComment = storageManager.getComment(lessonId);
            const commentValue = savedComment ? savedComment.text : '';
            html += `
                <div class="discussion-box">
                    <h4><i class="fas fa-comments"></i> Discusión de la lección</h4>
                    <p>${lesson.discussionPrompt}</p>
                    <textarea class="discussion-textarea" id="comment-${lessonId}" placeholder="Escribe tu comentario aquí...">${commentValue}</textarea>
                    <div class="discussion-actions">
                        <button class="btn btn-success submit-comment" data-lesson="${lessonId}">
                            <i class="fas fa-paper-plane"></i> Publicar Comentario
                        </button>
                    </div>
                </div>
            `;
        }
        // Add activity if exists
        if (lesson.hasActivity) {
            const activity = lesson.activity;
            const savedActivity = storageManager.getActivity(lessonId);
            const activityValue = savedActivity ? savedActivity.response : '';
            html += `
                <div class="practical-activity">
                    <h4><i class="fas fa-flask"></i> ${activity.title}</h4>
                    <p>${activity.description}</p>
            `;
            if (activity.prompt) {
                html += `
                    <div class="prompt-box">
                        <h4>Prompt sugerido:</h4>
                        <div class="prompt-content">${activity.prompt}</div>
                        <button class="btn btn-secondary copy-prompt" data-prompt="${encodeURIComponent(activity.prompt)}">
                            <i class="fas fa-copy"></i> Copiar Prompt
                        </button>
                    </div>
                `;
            }
            if (activity.instruction) {
                html += `<p>${activity.instruction}</p>`;
            }
            html += `
                    <textarea class="discussion-textarea" id="activity-${lessonId}" placeholder="${activity.responseField || 'Escribe tu respuesta aquí...'}">${activityValue}</textarea>
                    <div class="discussion-actions">
                        <button class="btn btn-success submit-activity" data-lesson="${lessonId}">
                            <i class="fas fa-save"></i> Guardar Respuesta
                        </button>
                    </div>
                </div>
            `;
        }
        // Add next lesson button (except for certificate)
        if (lessonId !== 'certificate') {
            const nextLessonId = storageManager.getNextLesson(lessonId);
            const isUnlocked = nextLessonId && storageManager.isLessonUnlocked(nextLessonId);
            if (nextLessonId) {
                const nextLesson = courseData.lessons[nextLessonId];
                html += `
                    <button class="btn btn-primary next-lesson ${isUnlocked ? '' : 'disabled'}" data-lesson="${nextLessonId}" ${isUnlocked ? '' : 'disabled'}>
                        <i class="fas fa-arrow-right"></i> Siguiente: ${nextLesson.title}
                        <small>Lección ${nextLessonId}</small>
                    </button>
                `;
            }
        }
        html += `</div>`;
        document.getElementById('lessonContent').innerHTML = html;
        // Add event listeners
        this.addEventListeners(lessonId);
    }
    static addEventListeners(lessonId) {
        // Submit comment
        const submitCommentBtn = document.querySelector(`.submit-comment[data-lesson="${lessonId}"]`);
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', function() {
                const textarea = document.getElementById(`comment-${lessonId}`);
                const comment = textarea.value.trim();
                if (comment) {
                    storageManager.saveComment(lessonId, comment);
                    alert('¡Comentario guardado!');
                    // Marcar lección como completada
                    storageManager.completeLesson(lessonId);
                    // Actualizar navegación y progreso
                    Navigation.updateNavigation();
                    Navigation.updateProgress();
                    // Habilitar botón "Siguiente" si existe
                    const nextLessonId = storageManager.getNextLesson(lessonId);
                    if (nextLessonId) {
                        const nextBtn = document.querySelector('.next-lesson');
                        if (nextBtn) {
                            nextBtn.disabled = false;
                            nextBtn.classList.remove('disabled');
                        }
                    }
                } else {
                    alert('Por favor, escribe un comentario antes de publicar.');
                }
            });
        }
        // Submit activity
        const submitActivityBtn = document.querySelector(`.submit-activity[data-lesson="${lessonId}"]`);
        if (submitActivityBtn) {
            submitActivityBtn.addEventListener('click', function() {
                const textarea = document.getElementById(`activity-${lessonId}`);
                const response = textarea.value.trim();
                if (response) {
                    storageManager.saveActivity(lessonId, response);
                    alert('¡Actividad guardada!');
                    // Marcar lección como completada
                    storageManager.completeLesson(lessonId);
                    // Actualizar navegación y progreso
                    Navigation.updateNavigation();
                    Navigation.updateProgress();
                    // Habilitar botón "Siguiente" si existe
                    const nextLessonId = storageManager.getNextLesson(lessonId);
                    if (nextLessonId) {
                        const nextBtn = document.querySelector('.next-lesson');
                        if (nextBtn) {
                            nextBtn.disabled = false;
                            nextBtn.classList.remove('disabled');
                        }
                    }
                } else {
                    alert('Por favor, completa la actividad antes de guardar.');
                }
            });
        }
        // Copy prompt
        const copyPromptBtns = document.querySelectorAll('.copy-prompt');
        copyPromptBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const promptText = decodeURIComponent(this.getAttribute('data-prompt'));
                navigator.clipboard.writeText(promptText).then(() => {
                    alert('¡Prompt copiado al portapapeles!');
                }).catch(err => {
                    console.error('Error al copiar: ', err);
                    alert('Error al copiar al portapapeles');
                });
            });
        });
        // Next lesson button
        const nextLessonBtn = document.querySelector('.next-lesson');
        if (nextLessonBtn) {
            nextLessonBtn.addEventListener('click', function() {
                const lessonId = this.getAttribute('data-lesson');
                if (storageManager.isLessonUnlocked(lessonId)) {
                    Navigation.loadLesson(lessonId);
                }
            });
        }
        // Guardar nombre del estudiante (solo en intro)
        if (lessonId === 'intro') {
            const saveNameBtn = document.getElementById('saveStudentName');
            if (saveNameBtn) {
                saveNameBtn.addEventListener('click', function() {
                    const nameInput = document.getElementById('studentName');
                    const studentName = nameInput.value.trim();
                    if (studentName) {
                        // Guardar en localStorage
                        const data = storageManager.getData() || storageManager.defaultData;
                        data.studentName = studentName;
                        storageManager.saveData(data);
                        alert(`¡Gracias, ${studentName}! Tu nombre ha sido guardado para tu certificado.`);
                        // Marcar intro como completada si tiene discusión/actividad
                        const lesson = courseData.lessons[lessonId];
                        if (lesson.hasDiscussion || lesson.hasActivity) {
                            storageManager.completeLesson(lessonId);
                            Navigation.updateNavigation();
                            Navigation.updateProgress();
                            // Habilitar botón "Siguiente"
                            const nextLessonId = storageManager.getNextLesson(lessonId);
                            if (nextLessonId) {
                                const nextBtn = document.querySelector('.next-lesson');
                                if (nextBtn) {
                                    nextBtn.disabled = false;
                                    nextBtn.classList.remove('disabled');
                                }
                            }
                        }
                    } else {
                        alert('Por favor, ingresa tu nombre completo antes de continuar.');
                    }
                });
            }
        }
    }
}

// ========== NAVIGATION ==========
class Navigation {
    static init() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.style.display = 'none';
        });
        // Load initial lesson
        const progress = storageManager.getProgress();
        this.loadLesson(progress.currentLesson);
        this.updateNavigation();
        this.updateProgress();
        // Add click events to nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const lessonId = item.getAttribute('data-lesson');
                if (storageManager.isLessonUnlocked(lessonId)) {
                    this.loadLesson(lessonId);
                    // Close mobile menu if open
                    if (window.innerWidth <= 768) {
                        document.getElementById('sidebar').classList.remove('open');
                        document.getElementById('mobileOverlay').style.display = 'none';
                    }
                } else {
                    alert('Esta lección aún no está disponible. Completa las lecciones anteriores primero.');
                }
            });
        });
        // Certificate modal events
        const closeCertificateBtn = document.getElementById('closeCertificate');
        if (closeCertificateBtn) {
            closeCertificateBtn.addEventListener('click', () => {
                document.getElementById('certificateModal').style.display = 'none';
                document.getElementById('certificatePreview').style.display = 'none';
            });
        }
        const downloadCertificateBtn = document.getElementById('downloadCertificate');
        if (downloadCertificateBtn) {
            downloadCertificateBtn.addEventListener('click', function() {
                const data = storageManager.getData();
                const studentName = data?.studentName || "Educador/a";
                const completionDate = data?.certificateData?.completionDate ? new Date(data.certificateData.completionDate) : new Date();
                const certId = Math.floor(10000 + Math.random() * 90000);
                // 🎉 Disparar confetis al descargar
                showConfetti();
                generatePDF(studentName, completionDate, certId);
            });
        }
        // Reiniciar curso (solo se muestra al final)
        const resetCourseBtn = document.getElementById('resetCourseBtn');
        if (resetCourseBtn) {
            resetCourseBtn.addEventListener('click', () => {
                storageManager.resetCourse();
            });
        }
        // Listen for course completion
        window.addEventListener('courseCompleted', () => {
            this.showCertificate();
        });
    }
    static loadLesson(lessonId) {
        LessonRenderer.renderLesson(lessonId);
        this.updateActiveLesson(lessonId);
    }
    static updateActiveLesson(lessonId) {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        // Add active class to current lesson
        const currentItem = document.querySelector(`.nav-item[data-lesson="${lessonId}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }
    static updateNavigation() {
        const progress = storageManager.getProgress();
        // Update completed and locked status
        document.querySelectorAll('.nav-item').forEach(item => {
            const lessonId = item.getAttribute('data-lesson');
            // Hide all status icons first
            const completedIcon = item.querySelector('.nav-status.completed');
            const lockedIcon = item.querySelector('.nav-status.locked');
            if (completedIcon) completedIcon.style.display = 'none';
            if (lockedIcon) lockedIcon.style.display = 'none';
            // Show appropriate icon
            if (storageManager.isLessonCompleted(lessonId)) {
                if (completedIcon) completedIcon.style.display = 'inline-block';
            } else if (!storageManager.isLessonUnlocked(lessonId)) {
                if (lockedIcon) lockedIcon.style.display = 'inline-block';
            }
        });
        // Mostrar botón de reinicio solo si el curso está completo
        const resetBtn = document.getElementById('resetCourseBtn');
        const certData = storageManager.getCertificateData();
        if (resetBtn) {
            resetBtn.style.display = certData.completed ? 'inline-block' : 'none';
        }
    }
    static updateProgress() {
        const percentage = storageManager.getProgressPercentage();
        const progressFill = document.getElementById('headerProgressFill');
        const progressText = document.getElementById('headerProgressText');
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% completado`;
    }
    static showCertificate() {
        const modal = document.getElementById('certificateModal');
        const conclusionDiv = document.getElementById('generatedConclusion');
        const certificatePreview = document.getElementById('certificatePreview');
        const downloadBtn = document.getElementById('downloadCertificate');
        const closeBtn = document.getElementById('closeCertificate');
        const data = storageManager.getData();
        const studentName = data?.studentName || "Educador/a";
        const completionDate = data?.certificateData?.completionDate ? new Date(data.certificateData.completionDate) : new Date();
        const certId = Math.floor(10000 + Math.random() * 90000); // ID aleatorio
        // Actualizar certificado visual
        document.getElementById('certificateName').textContent = studentName;
        document.getElementById('endDate').textContent = completionDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('certId').textContent = certId;
        document.getElementById('issueDate').textContent = completionDate.toLocaleDateString('es-ES');
        // Mostrar certificado visual
        certificatePreview.style.display = 'block';
        // 🎉 Disparar confeti CADA VEZ que se abre el certificado
        showConfetti();
        // (Opcional) Si quieres mantener la bandera "confettiShown" para estadísticas, puedes dejarla:
        if (!data.certificateData.confettiShown) {
            data.certificateData.confettiShown = true;
            storageManager.saveData(data);
        }
        // Generar conclusión personalizada
        setTimeout(() => {
            const allComments = storageManager.getAllCommentsText();
            let conclusion = '';
            if (allComments.length > 0) {
                conclusion = `
                    <p>Basado en tus reflexiones a lo largo del curso, aquí tienes tu conclusión personalizada:</p>
                    <p style="font-style: italic; margin: 1.5rem 0; padding: 1rem; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
                        "${allComments.split('\n')[0].substring(0, 200)}..."
                    </p>
                    <p>¡Tu compromiso con la reflexión y el aprendizaje es admirable! Estas son solo algunas de las ideas que compartiste, y demuestran cómo estás internalizando los conceptos para aplicarlos en tu contexto único.</p>
                `;
            } else {
                conclusion = `
                    <p>¡Felicitaciones por completar el curso! Aunque no compartiste comentarios específicos, tu progreso a través de todas las lecciones demuestra tu compromiso con el aprendizaje.</p>
                    <p>Recuerda que la verdadera magia ocurre cuando aplicas estos conceptos en tu aula. ¡Estamos emocionados de ver cómo transformarás tu práctica docente!</p>
                `;
            }
            conclusion += `
                <p><strong>Consejo final:</strong> Revisa tu "Biblioteca de Prompts" y elige una plantilla para implementar en tu próxima semana de clases. ¡Empieza pequeño y celebra cada victoria!</p>
            `;
            conclusionDiv.innerHTML = conclusion;
            storageManager.saveCertificateConclusion(conclusion);
        }, 1500);
        // Botón de descarga
        downloadBtn.onclick = function() {
            // 🎉 Disparar confetis al descargar
            showConfetti();
            generatePDF(studentName, completionDate, certId);
        };
        // Botón de cerrar
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            certificatePreview.style.display = 'none';
        };
        // Mostrar modal
        modal.style.display = 'flex';
    }
}

// ========== FUNCIONES AUXILIARES ==========
function generatePDF(name, date, certId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
    // Título "¡Felicidades!"
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(32);
    doc.setFont('times', 'bold');
    doc.text(`¡Felicidades, ${name}!`, 105, 60, { align: 'center' });
    // Subtítulo
    doc.setFontSize(18);
    doc.setFont('times', 'normal');
    doc.text("Has completado con éxito el curso:", 105, 85, { align: 'center' });
    // Nombre del curso
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text("“Capacitación en IA: Herramientas esenciales para docentes”", 105, 105, { 
        align: 'center', 
        maxWidth: 180 
    });
    // Línea decorativa
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.line(40, 120, 170, 120);
    // Texto principal
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    doc.text("Este certificado reconoce tu dedicación y dominio en el uso ético y", 105, 140, { align: 'center' });
    doc.text("efectivo de la inteligencia artificial para transformar tu práctica docente.", 105, 150, { align: 'center' });
    // Fecha
    doc.setFontSize(12);
    doc.text(`Finalizado el ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 170, { align: 'center' });
    // Firma
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text("Dirección General de Capacitación IA", 105, 200, { align: 'center' });
    // Pie de página
    doc.setFontSize(10);
    doc.setFont('times', 'italic');
    doc.setTextColor(102, 102, 102);
    doc.text(`Documento oficial • ID: IA-DOC-${certId}`, 105, 270, { align: 'center' });
    // Descargar
    const filename = `Felicidades_${name.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    alert(`🎉 ¡Certificado descargado!\nArchivo: ${filename}`);
}

// 🎉 Función reutilizable para mostrar confetis por encima de TODO
function showConfetti() {
    // Creamos un contenedor temporal para los confetis
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none'; // Para que no bloquee clicks
    confettiContainer.style.zIndex = '99999'; // ¡Por encima de TODO!
    document.body.appendChild(confettiContainer);

    // Efecto confeti DENTRO del contenedor con z-index alto
    confetti({
        particleCount: 200,
        spread: 180,
        origin: { y: 0.6 },
        colors: ['#ffcc00', '#003366', '#ffffff', '#d4af37'],
        container: confettiContainer // <-- ¡ESTO es lo clave!
    });

    // Limpiamos el contenedor después de 5 segundos
    setTimeout(() => {
        if (confettiContainer && confettiContainer.parentNode) {
            document.body.removeChild(confettiContainer);
        }
    }, 5000);
}

// ========== APP INITIALIZATION ==========
// Create global storage manager
const storageManager = new StorageManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    Navigation.init();
});