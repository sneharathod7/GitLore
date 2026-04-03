import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import StatsBar from "../components/landing/StatsBar";
import PainStatement from "../components/landing/PainStatement";
import BentoGrid from "../components/landing/BentoGrid";
import Comparison from "../components/landing/Comparison";
import HowItWorks from "../components/landing/HowItWorks";
import KnowledgeGraph from "../components/landing/KnowledgeGraph";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";

const Landing = () => {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <LandingNavbar />
      <HeroSection />
      <StatsBar />
      <PainStatement />
      <BentoGrid />
      <Comparison />
      <HowItWorks />
      <KnowledgeGraph />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Landing;
