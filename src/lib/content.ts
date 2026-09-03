export const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/research", label: "Research" },
  { to: "/platform", label: "Platform" },
  { to: "/people", label: "People" },
  { to: "/join", label: "Join Us" },
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact" },
] as const;

export const pillars = [
  {
    slug: "k12",
    number: "01",
    title: "K-12 Education",
    href: "/research/k12",
    card: "Designing the future of school learning in the age of AI, grounded in the realities of Indian classrooms and systems.",
    intro:
      "In the age of AI, Indian K-12 education confronts four fundamental questions: What should students learn? How should teachers teach? How do students learn most effectively? And how should learning be evaluated?",
    body: "CETLS designs and studies technology-enabled interventions that address these questions with scientific rigor and practical relevance. Our work is rooted in the distinctive conditions of Indian schooling — multilingual classrooms, large public systems, teacher capacity constraints, foundational literacy and numeracy priorities, and the ambitions of NEP 2020 — while generating knowledge that advances the global learning sciences.",
    dimensions: [
      {
        title: "What students should learn",
        text: "Curriculum frameworks, learning progressions, and competency models that balance foundational knowledge with the capabilities required in an AI era: critical thinking, problem-solving, collaboration, digital and AI literacy, creativity, and ethical reasoning — developed for Indian languages and contexts.",
      },
      {
        title: "How teachers should teach",
        text: "AI-supported and human-centered pedagogical tools and practices that amplify teacher expertise. This includes intelligent orchestration systems, classroom analytics, and professional learning models that work at scale in real Indian schools.",
      },
      {
        title: "How students learn",
        text: "Adaptive learning environments, multilingual tools, and scaffolds that promote deeper understanding, self-regulated learning, and learner agency. Research examines how students actually interact with these systems in classroom and home settings.",
      },
      {
        title: "How learning is evaluated",
        text: "Next-generation assessment approaches that remain valid when AI can generate traditional answers — formative systems, process data, authentic tasks, and feedback mechanisms that support both equity and continuous improvement.",
      },
    ],
  },
  {
    slug: "higher-education",
    number: "02",
    title: "Higher Education",
    href: "/research/higher-education",
    card: "Redesigning teaching, learning, and assessment in universities and colleges for an AI-transformed world.",
    intro:
      "Indian higher education is being reshaped by generative AI, massification, and the demand for graduates who can thrive in an AI-shaped economy. Faculty, academic leaders, and institutions need rigorous guidance on what to teach, how to teach, how students learn, and how learning should be evaluated.",
    body: "CETLS designs and studies technology-enabled interventions that answer these questions. Our work engages the distinctive features of Indian higher education — large-enrolment courses, diverse student preparedness, multilingual contexts, and the push for flexible, multidisciplinary curricula under NEP 2020 — while contributing evidence to the international research community.",
    dimensions: [
      {
        title: "What students should learn",
        text: "Programme and course designs that integrate disciplinary depth with AI-era competencies: critical and ethical use of AI, research and inquiry skills, interdisciplinary problem-solving, and professional readiness.",
      },
      {
        title: "How faculty should teach",
        text: "AI-supported instructional models and faculty development approaches for both large-enrolment and specialised courses. We develop tools and pedagogies that preserve the essential role of the teacher while amplifying reach and impact.",
      },
      {
        title: "How students learn",
        text: "Adaptive courseware, learning analytics, and collaborative environments that support self-regulated learning, conceptual understanding, and productive engagement with generative AI.",
      },
      {
        title: "How learning is evaluated",
        text: "Assessment approaches that remain meaningful in an AI era — authentic and performance-based tasks, process-oriented evaluation, competency-based systems, and analytics that provide timely feedback while supporting equity and student success.",
      },
    ],
  },
  {
    slug: "professionals",
    number: "03",
    title: "Flexible Learning for Professionals & Executives",
    href: "/research/professionals",
    card: "Designing adaptive, high-impact continuous learning that fits the realities of work and leadership.",
    intro:
      "Working professionals and executives must learn continuously as AI reshapes jobs, industries, and leadership itself. Organisations and learners need evidence-based answers to what professionals should learn, how learning should be designed, how adults learn most effectively under real constraints, and how progress and impact should be evaluated.",
    body: "CETLS designs and studies technology-enabled interventions that address these questions. Our work is grounded in the Indian and Global South context of rapid digital transformation, large and diverse workforces, and the growing demand for high-quality, scalable professional and executive development.",
    dimensions: [
      {
        title: "What professionals should learn",
        text: "Capabilities required in an AI-transformed workplace: AI literacy and fluency, domain-specific continuous learning, adaptive leadership, collaboration with intelligent systems, and ethical decision-making.",
      },
      {
        title: "How learning should be designed and facilitated",
        text: "Flexible, modular, and work-integrated architectures — micro-learning, cohort-based programmes, AI-supported coaching, and platforms that embed learning in the flow of work — designed for the time and motivation realities of adult learners.",
      },
      {
        title: "How professionals learn",
        text: "Self-directed and adaptive pathways, social and peer learning, and productive integration of AI tools, grounded in adult learning theory and real workplace contexts.",
      },
      {
        title: "How progress and impact are evaluated",
        text: "Approaches suited to professional learning: demonstration of competence, transfer to workplace performance, micro-credentials, continuous feedback, and measures of individual and organisational value.",
      },
    ],
  },
  {
    slug: "third-age",
    number: "04",
    title: "Third-Age Learning",
    href: "/research/third-age",
    card: "Enabling older adults to continue learning, connecting, and participating fully through thoughtfully designed technology-supported experiences.",
    intro:
      "As populations age and digital technologies become central to daily life, older adults face both new opportunities and barriers to continued learning. Families, community organisations, and older learners themselves need guidance on what is worth learning in later life, how learning should be supported, how older adults learn most effectively, and how progress and benefit should be understood.",
    body: "CETLS designs and studies technology-enabled interventions that address these questions with rigor and respect. Our work is rooted in Indian and Global South realities — demographic ageing, intergenerational families, uneven digital access, and the need for culturally resonant, low-barrier solutions — while contributing to the global knowledge base on lifelong learning and active ageing.",
    dimensions: [
      {
        title: "What is worth learning",
        text: "Opportunities that matter in later life: digital and AI literacy for everyday participation, cognitive engagement, health and financial literacy, creative expression, intergenerational knowledge sharing, and personal growth — designed for meaning and dignity.",
      },
      {
        title: "How learning is supported",
        text: "Age-friendly architectures: accessible platforms, community-based and intergenerational models, facilitated group learning, and gentle AI support that prioritise clarity, social presence, and respect for life experience.",
      },
      {
        title: "How older adults learn",
        text: "Motivation and meaning-making, social learning, adaptation to technology, and strategies that accommodate possible changes in cognition or digital familiarity, studied in real community and family settings.",
      },
      {
        title: "How progress and benefit are understood",
        text: "Evaluation focused on sustained engagement, sense of competence and connection, cognitive and social benefits, digital confidence, and contribution to well-being — rather than traditional high-stakes assessment.",
      },
    ],
  },
] as const;

export const approaches = [
  "AI for adaptive and personalised learning",
  "Learning engineering and evidence-based design",
  "Equity, access, and inclusion",
  "Human-centered design and HCI",
];

export const roadmap = [
  {
    phase: "Foundation",
    text: "Establish core team, launch the website and brand, define priority research themes, begin seed projects, and open collaboration pathways.",
  },
  {
    phase: "Momentum",
    text: "Produce early research outputs, pilot interventions, grow the team, advance the Learning Middleware toward open release, and establish first international and national partnerships.",
  },
  {
    phase: "Scale & Impact",
    text: "Expand across all four pillars, release open infrastructure, develop professional learning programmes, and demonstrate measurable impact with education systems and organisations.",
  },
];

export const joinPaths = [
  {
    title: "Students",
    text: "PhD, MS by Research, research assistantships, internships, and undergraduate research in learning sciences and educational technology.",
  },
  {
    title: "Researchers & postdocs",
    text: "Join a founding research team working across the lifespan, with space to build an independent agenda and collaborate internationally.",
  },
  {
    title: "Faculty collaborators",
    text: "Co-supervise students, co-author, and design joint projects with colleagues at IIIT Hyderabad and partner institutions.",
  },
  {
    title: "Education systems & industry",
    text: "Partner on pilots, sponsored research, workforce learning, and co-design of tools that serve schools, universities, and organisations.",
  },
  {
    title: "Educators & practitioners",
    text: "Workshops, open resources, and co-design of classroom, campus, and workplace interventions.",
  },
  {
    title: "Middleware contributors",
    text: "Early adopters, integrators, and open-source collaborators helping make learning-science tools widely usable.",
  },
];

export const newsItems = [
  {
    date: "5 September 2026",
    title: "Inauguration of CETLS at IIIT Hyderabad",
    text: "The Centre for Education Technology and Learning Sciences will be inaugurated at IIIT Hyderabad. CETLS is a research centre on how people learn, and on how learning should be designed, from school through working life and into later years.",
  },
];
