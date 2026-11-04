import { useState } from 'react';
import { Check, Copy, Trophy, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const referralLink = 'https://ctrlwebapp.web.app';

function LeaderboardPage() {
  const [copyStatus, setCopyStatus] = useState('');

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyStatus('Link copied!');
    } catch (error) {
      console.error('Could not copy the referral link:', error);
      setCopyStatus('Unable to copy the link. Please try again.');
    }
  };

  return (
    <div className="leaderboard-page">
      <section className="leaderboard-card" aria-labelledby="leaderboard-heading">
        <div className="leaderboard-trophy" aria-hidden="true">
          <Trophy size={34} strokeWidth={1.7} />
        </div>
        <h2 id="leaderboard-heading">Leaderboard is Coming Soon</h2>
        <p className="leaderboard-description">
          We are working hard to bring you a competitive ranking system. Soon you will be able to compete with friends, earn XP, and climb the ranks!
        </p>

        <div className="leaderboard-share-grid">
          <div className="leaderboard-invite-panel">
            <span className="leaderboard-share-icon" aria-hidden="true"><Users size={20} /></span>
            <button className="leaderboard-invite-button" type="button" onClick={copyReferralLink}>
              <span>Invite Friends</span>
              {copyStatus === 'Link copied!' ? <Check size={17} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
            <span className="leaderboard-copy-status" role="status" aria-live="polite">{copyStatus}</span>
          </div>

          <div className="leaderboard-qr-panel">
            <QRCodeSVG value={referralLink} size={132} level="M" title="Scan to open CTRL App" />
            <span>Scan to visit CTRL App</span>
          </div>
        </div>

      </section>
    </div>
  );
}

export default LeaderboardPage;
