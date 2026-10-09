import { useState } from "react";
import teamDirectory from "@/data/executiveTeam.json";

type Executive = (typeof teamDirectory.members)[number];

function ExecutiveCard({ member }: { member: Executive }) {
  const [photoError, setPhotoError] = useState(false);
  const showPhoto = Boolean(member.photo_url) && !photoError;

  return (
    <article className="executive-card" aria-labelledby={`${member.id}-name`}>
      <div className="executive-portrait">
        {showPhoto ? (
          <img
            src={member.photo_url!}
            alt={`${member.name}, ${member.job_title}`}
            loading="lazy"
            width={480}
            height={560}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="executive-photo-placeholder" role="img" aria-label={`Portrait of ${member.name} coming soon`}>
            <span className="executive-placeholder-ring" aria-hidden="true" />
            <span className="executive-initials" aria-hidden="true">{member.initials}</span>
            <span className="executive-photo-status">Photo coming soon</span>
          </div>
        )}
        <span className="executive-role-badge" aria-hidden="true">{member.abbreviation}</span>
      </div>
      <div className="executive-card-info">
        <h3 id={`${member.id}-name`} className="font-display">{member.name}</h3>
        <p>{member.job_title}</p>
      </div>
    </article>
  );
}

export default function ExecutiveTeam() {
  return (
    <section id="executive-team" aria-labelledby="executive-team-heading" className="executive-team-section">
      <div className="container">
        <div className="executive-team-heading">
          <div>
            <p className="eyebrow">Our leadership</p>
            <h2 id="executive-team-heading" className="section-title">Executive <em>Operations Team.</em></h2>
          </div>
          <p className="executive-team-intro">Meet the team behind Property Hub Exchange, Inc. and the Property Source Exchange platform.</p>
        </div>
        <div className="executive-team-grid">
          {teamDirectory.members.map((member) => <ExecutiveCard key={member.id} member={member} />)}
        </div>
      </div>
    </section>
  );
}
