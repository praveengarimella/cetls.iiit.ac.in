import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/people")({
  head: () => ({ meta: [{ title: "People | CETLS" }] }),
  component: PeoplePage,
});

const leadership = [
  {
    name: "Vasudeva Varma",
    roles: ["Professor at IIIT Hyderabad", "Head of CETLS"],
    email: "vv@iiit.ac.in",
    photo: "/people/vasudeva-varma.jpg",
    description: "Vasudeva Varma is a Professor and the Head of the Centre for Educational Technology and Learning Sciences (CETLS) at IIIT Hyderabad. He previously served as the Dean of Research and Development and CEO of IIIT Hyderabad. His research focuses on Information Retrieval, Extraction, and Access, with specific interests in Social Media Analysis, Semantic Search, and Text Generation. He is a recipient of the Google Research Award for his work in Artificial Intelligence and Machine Learning.",
    profileUrl: "https://faculty.iiit.ac.in/~vv/"
  },
  {
    name: "Praveen Garimella",
    roles: ["Associate Professor of Practice"],
    email: "praveeng@iiit.ac.in",
    photo: "/people/praveen-garimella.jpg",
    description: "Praveen Garimella is an educational technology practitioner, learning scientist, and systems architect. He serves as an Associate Professor of Practice at CETLS, IIIT Hyderabad, and as an Adjunct Faculty member in the Software & Societal Systems Department at Carnegie Mellon University. With over two decades of experience at the intersection of cognitive science, AI, and platform engineering, he focuses on designing intelligent tutoring systems and mastery-based learning ecosystems.",
    profileUrl: "https://www.linkedin.com/in/praveengarimella/"
  },
];

const adjunctFaculty = [
  {
    name: "Shantanu Paul",
    roles: ["Adjunct Faculty"],
  },
  {
    name: "Vamshi Ambati",
    roles: ["Adjunct Faculty"],
  },
];

function PeoplePage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">People</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted max-w-3xl mb-6">
          CETLS is a research centre at IIIT Hyderabad. Faculty and research staff profiles will appear here as the centre grows. The International Advisory Committee is listed below.
        </p>
        <p className="mb-16">
          <Link to="/advisory" className="font-medium text-accent hover:underline">
            International Advisory Committee →
          </Link>
        </p>

        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold mb-6">Chief Mentor</h2>
          
          <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
              <img src="/people/raj-reddy.jpg" alt="Prof. Raj Reddy" className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover object-top shrink-0 bg-border" />
              <div>
                <h3 className="font-display text-2xl font-semibold mb-1">Prof. Raj Reddy</h3>
                <p className="font-medium">Chief Mentor for CETLS</p>
                <p className="text-sm text-muted mt-1">Moza Bint Nasser University Professor of Computer Science and Robotics, Carnegie Mellon University<br />Founding Chairman, IIIT Hyderabad</p>
                <p className="text-muted leading-relaxed mt-4">
                  Dabbala Rajagopal "Raj" Reddy is an Indian-American computer scientist and one of the early pioneers of artificial intelligence. He has served on the faculty of Stanford and Carnegie Mellon for over 50 years and was the founding director of the Robotics Institute at Carnegie Mellon University. As the founding chairman of the International Institute of Information Technology, Hyderabad (IIIT-H), he has been instrumental in shaping the institution's vision. He and Edward Feigenbaum won the 1994 ACM Turing Award for their pioneering work in artificial intelligence. He serves as the Chief Mentor for CETLS, guiding its research and vision at the intersection of AI and education.
                </p>
                <a href="https://en.wikipedia.org/wiki/Raj_Reddy" className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold mb-6">Chief Mentor</h2>
          <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
              <img src="/people/raj-reddy.jpg" alt="Prof. Raj Reddy" className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover object-top shrink-0 bg-border" />
              <div>
                <h3 className="font-display text-2xl font-semibold mb-1">Prof. Raj Reddy</h3>
                <p className="font-medium">Moza Bint Nasser University Professor of Computer Science and Robotics, Carnegie Mellon University</p>
                <p className="text-muted leading-relaxed mt-4">
                  Dabbala Rajagopal "Raj" Reddy is an Indian-American computer scientist and one of the early pioneers of artificial intelligence. He serves as the Chief Mentor for CETLS, guiding its research and vision at the intersection of AI and education. He and Edward Feigenbaum won the 1994 ACM Turing Award for their pioneering work in artificial intelligence.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold mb-3">International Advisory Committee</h2>
          <p className="text-muted leading-relaxed max-w-3xl mb-8">
            The committee advises the Centre for Educational Technology and Learning Sciences on research, design, and evidence at the meeting point of AI, educational technology, and the learning sciences.
          </p>

          <div className="space-y-8">
            <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <img src="/people/ashok-goel.png" alt="Ashok K. Goel" className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover object-top shrink-0 bg-border" />
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-1">Ashok K. Goel</h3>
                  <p className="font-medium">Professor of Computer Science and Human-Centered Computing, Georgia Institute of Technology</p>
                  <p className="text-sm text-muted mt-1">Executive Director, NSF National AI Institute for Adult Learning and Online Education<br />Chief Scientist, Center for 21st Century Universities</p>
                  <p className="text-muted leading-relaxed mt-4">
                    Ashok Goel works at the intersection of artificial intelligence, cognitive science, and learning. For more than a decade his research has focused on AI in education and education in AI. His laboratory created Jill Watson, among the first virtual teaching assistants used at scale in online higher education, and he leads the US National Science Foundation’s AI Institute for Adult Learning and Online Education. A Fellow of AAAI and the Cognitive Science Society, he received AAAI’s Outstanding AI Educator Award. He advises CETLS on how AI can support teaching presence, adult and online learning, and institute-scale experimentation rather than one-off tools.
                  </p>
                  <a href="https://www.cc.gatech.edu/people/ashok-goel" className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
                </div>
              </div>
            </article>

            <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <img src="/people/ryan-baker.png" alt="Ryan S. Baker" className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover object-top shrink-0 bg-border" />
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-1">Ryan S. Baker</h3>
                  <p className="font-medium">Professor of Artificial Intelligence and Education, Adelaide University</p>
                  <p className="text-sm text-muted mt-1">Director, Penn Center for Learning Analytics<br />Adjunct Professor, University of Pennsylvania Graduate School of Education</p>
                  <p className="text-muted leading-relaxed mt-4">
                    Ryan Baker uses educational data mining and learning analytics to study how students actually use digital learning environments — and what that use predicts. He has built models of engagement, affect, and “gaming the system” across intelligent tutors, games, and MOOCs, and developed the BROMP classroom observation protocol used by researchers in several countries. Founding president of the International Educational Data Mining Society and Associate Editor of the <em>Journal of Educational Data Mining</em>, he teaches the long-running MOOC Big Data and Education. He advises CETLS on evidence, measurement, and the responsible use of learner data across K-12 and higher education.
                  </p>
                  <a href="https://www.upenn.edu/learninganalytics/ryanbaker/" className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
                </div>
              </div>
            </article>

            <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <img src="/people/matthew-kam.png" alt="Matthew Kam" className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover object-top shrink-0 bg-border" />
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-1">Matthew Kam</h3>
                  <p className="font-medium">Former Employee of Google</p>
                  <p className="text-sm text-muted mt-1">Former Staff User Experience Researcher, Software Engineering Education</p>
                  <p className="text-muted leading-relaxed mt-4">
                    Matthew Kam studies how learning technologies are designed and used at scale, and how AI is changing the work people must learn to do. At Google he led research that shaped products used by more than 100 million students and teachers, including Chromebooks in education, Google Classroom, Google Forms, and Expeditions. His earlier academic work at UC Berkeley and Carnegie Mellon designed mobile literacy games with children in rural and low-income schools in India. He advises organizations including Google.org, UNICEF, and the Computing Research Association. For CETLS he brings human-centered product research, workforce-relevant AI learning, and design for large, diverse school systems.
                  </p>
                  <a href="https://scholar.google.com/citations?user=HDDSjm0AAAAJ" className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
                </div>
              </div>
            </article>

            <article className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <img src="/people/derek-lomas.png" alt="J. Derek Lomas" className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover object-top shrink-0 bg-border" />
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-1">J. Derek Lomas</h3>
                  <p className="font-medium">Professor of Positive AI, Faculty of Industrial Design Engineering, TU Delft</p>
                  <p className="text-sm text-muted mt-1">Director, AI &amp; Experience Design Lab<br />Cofounder, Playpower Labs and Smart Paper</p>
                  <p className="text-muted leading-relaxed mt-4">
                    Derek Lomas designs AI systems that support learning and wellbeing, not only efficiency. Trained in cognitive science (Yale), design (UC San Diego), and HCI (Carnegie Mellon, with Ken Koedinger and Jodi Forlizzi), he used large-scale experiments to optimize educational games for motivation and learning. Through Playpower Labs and Smart Paper he has reached millions of learners; Smart Paper’s computer-vision assessment of paper work has been used in 65,000 schools in India, reaching 4.7 million students. He advises CETLS on learning-experience design, AI at classroom scale in Indian contexts, and keeping human judgement at the centre of automated systems.
                  </p>
                  <a href="https://www.tudelft.nl/en/ide/about-ide/people/lomas-j-d" className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold mb-6">Leadership</h2>
          <div className="space-y-8">
            {leadership.map((p) => (
              <article key={p.name} className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <img src={p.photo} alt={p.name} className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover object-top shrink-0 bg-border" />
                  <div>
                    <h3 className="font-display text-2xl font-semibold mb-1">{p.name}</h3>
                    <div className="font-medium">
                      {p.roles.map((role) => (
                        <p key={role}>{role}</p>
                      ))}
                    </div>
                    {p.email && (
                      <p className="text-sm mt-1">
                        <a href={`mailto:${p.email}`} className="text-muted hover:text-accent">{p.email}</a>
                      </p>
                    )}
                    {p.description && (
                      <p className="text-muted leading-relaxed mt-4">
                        {p.description}
                      </p>
                    )}
                    {p.profileUrl && (
                      <a href={p.profileUrl} className="inline-block mt-4 text-sm font-medium text-accent hover:underline" target="_blank" rel="noopener noreferrer">Profile →</a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold mb-6">Adjunct Faculty</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {adjunctFaculty.map((p) => (
              <article key={p.name} className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-display text-xl font-semibold mb-1">{p.name}</h3>
                <div className="font-medium text-muted">
                  {p.roles.map((role) => (
                    <p key={role}>{role}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
