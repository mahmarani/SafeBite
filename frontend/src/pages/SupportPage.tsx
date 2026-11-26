import React, { useMemo, useState } from 'react';
import { ChevronDown, Mail, Search, Send } from 'lucide-react';
import { Button } from '../components/common/Button';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const FAQ_ITEMS = [
  {
    id: 'faq-scoring',
    question: 'How are NutriLens Health Grades (A–E) and scores calculated?',
    answer:
      'In this frontend prototype, products receive a 0–100 score mapped into five visual grades (A: 88–100, B: 80–87, C: 65–79, D: 50–64, E: 0–49) alongside a 1–4 food processing tier and traffic-light nutrient levels for Fat, Saturated Fat, Sugars, and Sodium. In the planned production backend, a Python Machine Learning model will evaluate OCR-extracted labels.',
  },
  {
    id: 'faq-personalized',
    question: 'When do personalized health warnings appear?',
    answer:
      'Personalized insights only trigger when your saved Health Profile contains a matching allergy, medical condition, dietary preference, or goal — and when "Include my health profile for personalized analysis" is enabled during scanning.',
  },
  {
    id: 'faq-formats',
    question: 'Which image file formats can I upload to the Product Scanner?',
    answer:
      'You can upload JPG, JPEG, or PNG images up to 8 MB via drag-and-drop or your device file picker. You can also click "Use Sample Label Photo" to test the complete analysis flow immediately.',
  },
  {
    id: 'faq-privacy',
    question: 'Where is my health profile and scan history stored?',
    answer:
      'During this frontend development phase, all profile settings, product analyses, and bookmarks are persisted locally in your browser via localStorage. No personal health information is transmitted to external servers or printed to console logs.',
  },
  {
    id: 'faq-medical',
    question: 'Does NutriLens provide clinical or medical advice?',
    answer:
      'No. NutriLens is an educational ingredient clarity tool. Provisional scores, A–E grades, and allergen flags do not replace advice from a physician or registered dietitian, and you should always verify physical packaging labels for severe allergies.',
  },
];

export function SupportPage() {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [faqQuery, setFaqQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  const [topic, setTopic] = useState('Product Scanner');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [faqQuery]);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setFormError('Please provide a valid email address so we can follow up.');
      return;
    }
    if (message.trim().length < 10) {
      setFormError('Please include at least 10 characters describing your question or feedback.');
      return;
    }

    setFormError(null);
    setMessage('');
    showToast({
      type: 'success',
      title: 'Support request logged',
      description: `Your ${topic.toLowerCase()} inquiry has been recorded in this frontend demo.`,
    });
  };

  const content = (
    <div
      className={`space-y-6 ${
        isAuthenticated ? '' : 'max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-10'
      }`}
    >
      <div>
        <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-[14px] text-[#5C534A]">
          Answers on A–E grades, traffic-light nutrient thresholds, allergen matching, and privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 card-surface overflow-hidden">
          <div className="p-5 border-b border-[#E8E1D5] space-y-3">
            <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
              Frequently Asked Questions
            </h2>
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search help articles..."
                className="input-field h-[40px] w-full pl-10 pr-3.5 text-[14px]"
              />
            </div>
          </div>

          <div className="divide-y divide-[#EFE9DF]">
            {filteredFaqs.length === 0 ? (
              <p className="p-6 text-[14px] text-[#6A6057] text-center">
                No matching help topics found. Send us a message using the form.
              </p>
            ) : (
              filteredFaqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                    >
                      <span className="text-[14px] font-bold text-[#1F1A17]">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#6A6057] shrink-0 transition-transform duration-150 ${
                          isOpen ? 'rotate-180 text-[#1D7A46]' : ''
                        }`}
                        strokeWidth={2}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-[13px] leading-[21px] text-[#423A34]">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-5 card-surface p-5 sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E8E1D5]">
            <Mail className="w-5 h-5 text-[#1D7A46]" strokeWidth={1.8} />
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Contact Support
              </h2>
              <p className="text-[12px] text-[#6A6057]">
                Report a label question or request a feature.
              </p>
            </div>
          </div>

          <form onSubmit={handleSupportSubmit} noValidate className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="support-topic"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Topic
              </label>
              <select
                id="support-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
              >
                <option value="Product Scanner">Product Scanner &amp; Uploads</option>
                <option value="Scoring & Ingredients">Scoring &amp; Ingredients</option>
                <option value="Health Profile">Health Profile &amp; Allergies</option>
                <option value="Account & Privacy">Account &amp; Privacy</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="support-email"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Your email
              </label>
              <input
                id="support-email"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  setFormError(null);
                }}
                placeholder="you@example.com"
                className="input-field h-[42px] w-full px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label
                htmlFor="support-message"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Message
              </label>
              <textarea
                id="support-message"
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setFormError(null);
                }}
                placeholder="Describe your question or product label issue..."
                className="input-field w-full p-3 text-[14px] resize-y"
              />
            </div>

            {formError && <p className="text-[12px] text-[#9B1F1B]">{formError}</p>}

            <Button type="submit" variant="primary" fullWidth>
              <Send className="w-4 h-4" strokeWidth={2} />
              <span>Send Message</span>
            </Button>
          </form>
        </section>
      </div>

      <MedicalDisclaimer />
    </div>
  );

  return isAuthenticated ? (
    <DashboardLayout>{content}</DashboardLayout>
  ) : (
    <PublicLayout>{content}</PublicLayout>
  );
}
