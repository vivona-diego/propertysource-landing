import { ArrowRight, Bot, Cpu, Globe2, Handshake, MessageCircle, PlugZap, ScanSearch, Sparkles, Workflow } from "lucide-react";

const capabilities = [
  {
    icon: Handshake,
    label: "Recruit & connect",
    title: "Growth that never sleeps.",
    text: "Conversational AI agents reach marketplace partners, property owners, and wholesalers—helping bring new communities and property deals into the exchange.",
  },
  {
    icon: MessageCircle,
    label: "Chat • Voice • Phone",
    title: "Answers in every channel.",
    text: "From text chat and live on-platform voice conversations to phone support, AI agents guide members through navigation, technical questions, and the next step.",
  },
  {
    icon: ScanSearch,
    label: "Analyze & inform",
    title: "Intelligence behind every deal.",
    text: "AI helps analyze properties, lenders, and relevant information—organizing complex data into useful insights that support more informed decisions.",
  },
  {
    icon: Workflow,
    label: "Orchestrate & streamline",
    title: "An always-on operating layer.",
    text: "AI agents take on routine outreach, support, and coordination duties, creating a scalable 24/7 digital workforce that helps streamline transactions worldwide.",
  },
];

export default function AIPoweredExchange() {
  return (
    <section id="ai-powered-exchange" aria-labelledby="ai-exchange-heading" className="ai-exchange-section">
      <div className="container">
        <div className="ai-exchange-intro">
          <div>
            <p className="eyebrow">AI Powered Exchange</p>
            <h2 id="ai-exchange-heading" className="section-title">The network is the power.<br /><em>AI is the multiplier.</em></h2>
            <p className="ai-exchange-lead">A global network of buyers and sellers. An intelligent operating layer that never sleeps.</p>
            <p className="ai-exchange-copy">Property Hub Exchange puts AI to work across Property Source Exchange—from recruiting marketplace partners and sourcing property opportunities to member support, analysis, and transaction coordination. The real strength is the people and opportunities in the network. AI orchestrates the information, reduces friction, and helps buyers and sellers move forward across connected marketplaces worldwide.</p>
          </div>
          <div className="ai-network-panel" aria-label="AI agents facilitate outreach, support, analysis, and transaction coordination around the clock">
            <div className="ai-agent-background" aria-hidden="true" />
            <div className="ai-network-topline"><span><Sparkles size={13} aria-hidden="true" /> Intelligence in motion</span><span className="ai-network-status"><span aria-hidden="true" />Always on</span></div>
            <div className="ai-agent-card-heading"><span className="ai-agent-processor"><Cpu size={24} aria-hidden="true" /></span><h3>AI agents.<br /><span>Real work. Around the clock.</span></h3></div>
            <p className="ai-agent-card-summary"><strong>24/7</strong> An intelligent workforce supporting your marketplace.</p>
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

        <div className="ai-agent-bridge">
          <span className="ai-bridge-icon"><PlugZap size={25} aria-hidden="true" /></span>
          <div><p className="eyebrow">Built for an agent-connected future</p><h3>Your investors bring their AI. We connect the opportunity.</h3><p>The exchange is designed to help investor-operated AI agents discover and work with property deals through connected, machine-readable interfaces. AI inside the platform and agents outside it can support a more connected real estate ecosystem.</p><small>External-agent access depends on the supported integration and its permissions.</small></div>
          <span className="ai-bridge-mark" aria-hidden="true"><Bot size={28} /><ArrowRight size={16} /><Globe2 size={28} /></span>
        </div>
      </div>
    </section>
  );
}
