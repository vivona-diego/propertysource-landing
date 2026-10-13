import { ArrowRight, Building2, Check, Handshake, House, Infinity as InfinityIcon, LayoutDashboard, Megaphone, Store, Users } from "lucide-react";

const hostingRoles = [
  { id: "buyer", title: "When your marketplace hosts the buyer", member: "Your buyer", action: "Your member buys a property from any marketplace on the exchange.", feeLabel: "Buyer technology fee", fee: "$1,500", share: "$300", calculation: "$1,500 × 20% = $300", icon: Users },
  { id: "seller", title: "When your marketplace hosts the seller", member: "Your seller", action: "Your member lists and sells a property to a buyer from any marketplace on the exchange.", feeLabel: "Seller technology fee", fee: "$500", share: "$100", calculation: "$500 × 20% = $100", icon: House },
];

export default function EarnRevenue() {
  return (
    <section id="revenue" className="revenue-section" aria-labelledby="revenue-heading">
      <div className="container">
        <div className="revenue-intro">
          <div>
            <p className="eyebrow">Earn revenue</p>
            <h2 id="revenue-heading" className="section-title">Your community transacts.<br /><em>Your marketplace earns.</em></h2>
            <p className="revenue-lead">Connect your existing marketplace or launch a branded one with our templates. We run the technology. You grow your investor community or brokerage network.</p>
          </div>
          <div className="revenue-free">
            <p>Free to launch. Free to connect.</p>
            <ul>{["No setup fees", "No monthly fees", "No out-of-pocket costs"].map((benefit) => <li key={benefit}><Check size={15} aria-hidden="true" />{benefit}</li>)}</ul>
          </div>
        </div>

        <div className="revenue-transaction" aria-labelledby="transaction-diagram-heading">
          <div className="revenue-figure-heading"><h3 id="transaction-diagram-heading">Two ways to earn on every completed sale.</h3><span>20% of each member’s technology fee</span></div>
          <p className="revenue-equal-members"><Users size={16} aria-hidden="true" /><span><strong>Every marketplace can host both buyers and sellers.</strong> Your share follows the members your marketplace brings.</span></p>
          <div className="revenue-hosting-grid">
            {hostingRoles.map(({ id, title, member, action, feeLabel, fee, share, calculation, icon: MemberIcon }) => (
              <figure key={id} className={`revenue-hosting-card revenue-hosting-${id}`} aria-labelledby={`hosting-${id}-heading`}>
                <h4 id={`hosting-${id}-heading`}>{title}</h4>
                <div className="revenue-hosting-illustration" aria-label={`Your marketplace hosts ${member.toLowerCase()}; the sale completes.`}>
                  <div><span><Store size={24} aria-hidden="true" /></span><b>Your marketplace</b></div>
                  <ArrowRight size={17} aria-hidden="true" />
                  <div><span><MemberIcon size={24} aria-hidden="true" /></span><b>{member}</b></div>
                  <ArrowRight size={17} aria-hidden="true" />
                  <div><span><Check size={24} aria-hidden="true" /></span><b>Sale completed</b></div>
                </div>
                <p className="revenue-hosting-action">{action}</p>
                <div className="revenue-fee"><span>{feeLabel}</span><strong>{fee}</strong></div>
                <div className="revenue-hosting-payment"><div><strong>{share}</strong><span>to your marketplace owner</span></div><span className="revenue-hosting-calculation">{calculation}</span></div>
                <figcaption>{id === "buyer" ? "Buyer-hosting revenue share" : "Seller-hosting revenue share"}</figcaption>
              </figure>
            ))}
          </div>
          <div className="revenue-scenarios">
            <article className="revenue-scenario revenue-scenario-same"><div><p className="revenue-scenario-label">Host both members</p><h4>One marketplace. Both shares.</h4><p>Your member sells to another member of your marketplace. You receive both shares.</p></div><div className="revenue-scenario-total"><strong>$400</strong><span>$300 buyer + $100 seller<br />to your marketplace owner</span></div></article>
            <article className="revenue-scenario"><div><p className="revenue-scenario-label">Different marketplaces</p><h4>Each host earns its member’s share.</h4><p>Your marketplace hosts the buyer: you receive $300. Another hosts the seller: it receives $100. If the roles reverse, so do the shares.</p></div><div className="revenue-scenario-split"><span><strong>$300</strong>buyer’s host</span><span><strong>$100</strong>seller’s host</span></div></article>
          </div>
          <p className="revenue-transaction-note">Hosting shares come from the member’s technology fee—not an extra hosting charge or a percentage of the property price. Earned on completed sales, not listings or offers.</p>
        </div>

        <article className="revenue-ambassador" aria-labelledby="ambassador-heading">
          <div className="revenue-ambassador-title"><span className="revenue-ambassador-percent">5%</span><div><p className="eyebrow">Ambassador program</p><h3 id="ambassador-heading">Refer a marketplace. Earn as it grows.</h3></div></div>
          <div className="revenue-referral-flow" aria-label="Refer a new marketplace; that marketplace completes transactions; you receive the ambassador share."><span><Handshake size={17} aria-hidden="true" />You refer</span><ArrowRight size={15} aria-hidden="true" /><span><Building2 size={17} aria-hidden="true" />They transact</span><ArrowRight size={15} aria-hidden="true" /><span>You earn 5%</span></div>
          <p className="revenue-ambassador-copy">Earn an ongoing 5% ambassador share from transaction activity generated by each new independent marketplace you refer to the exchange.</p>
        </article>

        <article className="revenue-advertising" aria-labelledby="advertising-heading"><span className="revenue-advertising-icon"><Megaphone size={22} aria-hidden="true" /></span><div><p className="eyebrow">Your marketplace. Your advertisers.</p><h3 id="advertising-heading">Free built-in banner advertising.</h3><p>Post unlimited ads for vendors, services, or anything you choose to promote. Only your marketplace’s members see those placements. Manage them in your owner dashboard, with full control and no platform charge or advertising revenue share.</p></div><p className="revenue-advertising-share"><strong>100%</strong><span>of your advertising &amp;<br />affiliate revenue stays with you</span></p></article>

        <div className="revenue-footer"><p><InfinityIcon size={20} aria-hidden="true" /><span><strong>Evergreen, not a one-time reward.</strong> Revenue shares continue while the relevant marketplaces remain active and transacting.</span></p><a className="revenue-cta" href="https://app.propertysource.app/register" target="_blank" rel="noopener noreferrer">Start your free marketplace <ArrowRight size={16} aria-hidden="true" /></a></div>
        <div className="revenue-smallprint"><p><LayoutDashboard size={14} aria-hidden="true" />Transactions and revenue shares are tracked in your owner dashboard.</p></div>
      </div>
    </section>
  );
}
