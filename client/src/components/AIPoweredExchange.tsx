import { ArrowRight, Bot, Cpu, FileCheck2, Handshake, MessageCircle, PlugZap, ScanSearch, Sparkles, Workflow } from "lucide-react";
import messaging from "@/data/exchangeMessaging.json";

const capabilities = [
  {
    icon: Handshake,
    label: "Recruit & connect",
    title: "Growth that never sleeps.",
    text: "Conversational AI agents support outreach to marketplace partners, property owners, and wholesalers—helping connect new communities and property opportunities to the exchange.",
  },
  {
    icon: MessageCircle,
    label: "Chat • Voice • Phone",
    title: "Answers in every channel.",
    text: "Text chat, live on-platform voice, and phone support help members navigate the platform, resolve technical questions, and find their next step.",
  },
  {
    icon: ScanSearch,
    label: "Analyze & inform",
    title: "Intelligence behind every deal.",
    text: "AI helps organize property, lender, and transaction information into useful insights that support informed decisions—not replace professional judgment.",
  },
  {
    icon: Workflow,
    label: "Orchestrate & streamline",
    title: "An always-on operating layer.",
    text: "AI-supported outreach, assistance, and coordination create a 24/7 digital workforce around the network while preserving the controls each transaction requires.",
  },
];

const workflowIcons = [ScanSearch, FileCheck2, Workflow];

export default function AIPoweredExchange() {
  const ai = messaging.ai;
  return (
    <section id="ai-powered-exchange" aria-labelledby="ai-exchange-heading" className="ai-exchange-section">
      <div className="container">
        <div className="ai-exchange-intro">
          <div>
            <p className="eyebrow">AI Powered Exchange</p>
            <h2 id="ai-exchange-heading" className="section-title">Your network.<br />Your agents.<br /><em>One live exchange.</em></h2>
            <p className="ai-exchange-lead">{ai.lead}</p>
            <p className="ai-exchange-copy">{ai.summary}</p>
            <p className="ai-exchange-copy">{ai.service_note}</p>
          </div>
          <div className="ai-network-panel" aria-label="AI agents facilitate outreach, support, analysis, and transaction coordination around the clock">
            <div className="ai-agent-background" aria-hidden="true" />
            <div className="ai-network-topline"><span><Sparkles size={13} aria-hidden="true" /> Intelligence in motion</span><span className="ai-network-status"><span aria-hidden="true" />Always on</span></div>
            <div className="ai-agent-card-heading"><span className="ai-agent-processor"><Cpu size={24} aria-hidden="true" /></span><h3>AI agents.<br /><span>Real work. Around the clock.</span></h3></div>
            <p className="ai-agent-card-summary"><strong>24/7</strong> An intelligent workforce supporting the shared infrastructure.</p>
            <div className="ai-service-agents">
              <div className="ai-service-agent"><Handshake size={20} aria-hidden="true" /><div><h4>Outreach agents</h4><p>Connect partners & source deals</p></div></div>
              <div className="ai-service-agent"><MessageCircle size={20} aria-hidden="true" /><div><h4>Support agents</h4><p>Guide members by chat & voice</p></div></div>
              <div className="ai-service-agent"><ScanSearch size={20} aria-hidden="true" /><div><h4>Analysis agents</h4><p>Research properties & lenders</p></div></div>
              <div className="ai-service-agent"><Workflow size={20} aria-hidden="true" /><div><h4>Transaction agents</h4><p>Help coordinate each next step</p></div></div>
            </div>
            <p className="ai-network-caption"><Bot size={14} aria-hidden="true" />AI-powered services. One connected platform.</p>
          </div>
        </div>

        <div className="ai-capability-grid">
          {capabilities.map(({ icon: Icon, label, title, text }) => (
            <article className="ai-capability-card" key={title}>
              <div className="ai-capability-top"><span className="ai-capability-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span><span>{label}</span></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <div className="agent-access-panel" aria-labelledby="agent-access-heading">
          <div className="agent-access-heading">
            <span className="ai-bridge-icon"><PlugZap size={25} aria-hidden="true" /></span>
            <div><p className="eyebrow">{ai.gateway_eyebrow}</p><h3 id="agent-access-heading">{ai.gateway_heading}</h3><p>{ai.gateway_copy}</p></div>
          </div>
          <ol className="agent-access-flow">
            {ai.workflow.map((step, index) => {
              const Icon = workflowIcons[index];
              return <li key={step.title}><span className="agent-flow-number">0{index + 1}</span><Icon size={21} aria-hidden="true" /><h4>{step.title}</h4><p>{step.text}</p></li>;
            })}
          </ol>
          <div className="agent-access-footer"><p>{ai.access_note}</p><a href="https://app.propertysource.app/register" target="_blank" rel="noopener noreferrer" className="revenue-cta">{ai.cta}<ArrowRight size={15} aria-hidden="true" /></a></div>
        </div>

        <div className="exchange-faq" aria-labelledby="exchange-faq-heading">
          <p className="eyebrow">Clear answers</p>
          <h3 id="exchange-faq-heading">Live today. Clear on what comes next.</h3>
          <div className="exchange-faq-grid">
            {ai.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}
          </div>
        </div>
      </div>
    </section>
  );
}
