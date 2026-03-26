import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Cpu,
  CreditCard,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Users,
  Phone,
  Crown,
  Check,
  Server,
  Youtube,
} from "lucide-react";
import NeonBackground from "../components/NeonBackground";
import WolfChat from "../components/WolfChat";
import {
  COUNTRIES,
  getCountryList,
  getCountryByCode,
  formatCurrency,
  convertFromKES,
  DEFAULT_COUNTRY,
} from "../lib/currencyConfig";

export default function Landing() {
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const countryConfig = getCountryByCode(selectedCountry);
  const userCurrency = countryConfig.currency;
  const [siteLinks, setSiteLinks] = useState({
    whatsappChannel: 'https://whatsapp.com/channel/0029Vb6dn9nEQIaqEMNclK3Y',
    whatsappGroup: 'https://chat.whatsapp.com/HjFc3pud3IA0R0WGr1V2Xu',
    youtube: 'https://www.youtube.com/@Silentwolf906',
    supportPhone: 'https://wa.me/254713046497',
    supportPhoneDisplay: '+254 713 046 497',
  });

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(data => { if (data.success) setSiteLinks(data.settings); })
      .catch(() => {});
  }, []);

  const features = [
    {
      title: "Hyper-Speed Servers",
      description: "Dedicated NVMe cores with 99.99% uptime guarantee.",
      icon: Cpu,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Ironclad Security",
      description: "DDoS protection and automated daily backups included.",
      icon: Shield,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10",
    },
    {
      title: "Instant Payments",
      description: "Seamless deposits via M-Pesa STK Push.",
      icon: CreditCard,
      iconColor: "text-green-400",
      iconBg: "bg-green-500/10",
    },
  ];

  const stats = [
    { value: "99.99%", label: "Uptime SLA" },
    { value: "24/7", label: "Support" },
    { value: "60s", label: "Deployment" },
    { value: "15+", label: "Locations" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <NeonBackground intensity={0.6} />

      <nav className="fixed w-full z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <motion.div
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/5 border border-primary/20"
                animate={{
                  boxShadow: [
                    "0 0 10px hsl(120 100% 50% / 0.2)",
                    "0 0 20px hsl(120 100% 50% / 0.3)",
                    "0 0 10px hsl(120 100% 50% / 0.2)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="h-6 w-6 text-primary/90" />
              </motion.div>
              <div className="ml-3">
                <span className="text-xl font-display font-bold tracking-widest">
                  <span className="text-primary">WOLF</span>
                  <span className="text-gray-400">HOST</span>
                </span>
                <p className="text-xs text-gray-500 font-mono">
                  I am just an explorer
                </p>
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-3">
              <Link to="/login">
                <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors duration-200">
                  Log In
                </button>
              </Link>
              <Link to="/register">
                <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg transition-all duration-200">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 z-10">
        <div className="relative max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 text-center z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6"
          >
            <span className="text-white">POWER YOUR</span>{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary/90 via-primary to-primary/70 bg-clip-text text-transparent">
              DIGITAL EMPIRE
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-2 text-lg text-gray-400 font-mono"
          >
            I am just an explorer - Silent Wolf
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-4 max-w-2xl mx-auto text-lg text-gray-400 font-mono"
          >
            Premium hosting infrastructure for the next generation. Deploy
            servers in seconds. Pay with crypto or mobile money.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/register">
              <motion.button
                className="px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Deploy Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button
                className="px-6 py-3 text-gray-300 hover:text-white hover:bg-white/5 border border-gray-700 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Client Area
              </motion.button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-12 w-full"
          >
            <div className="flex flex-col items-center mb-6">
              <label className="text-xs text-gray-500 font-mono mb-1.5 tracking-wider uppercase">
                Select your region
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-black/60 border border-primary/30 text-primary font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 cursor-pointer appearance-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300ff00' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: "32px",
                }}
              >
                {getCountryList().map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} — {country.currencyName} (
                    {country.currencySymbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
              {[
                {
                  name: "Limited",
                  price: 50,
                  icon: Zap,
                  desc: "Perfect for getting started",
                  specs: [
                    "5GB RAM",
                    "10GB Storage",
                    "1 vCPU",
                    "10 Slots",
                    "Basic DDoS Protection",
                    "Community Support",
                  ],
                  highlight: false,
                },
                {
                  name: "Unlimited",
                  price: 100,
                  icon: Shield,
                  desc: "Best value for growing projects",
                  specs: [
                    "Unlimited RAM",
                    "40GB Storage",
                    "2 vCPU",
                    "Unlimited Slots",
                    "Advanced DDoS Protection",
                    "Priority Support",
                  ],
                  highlight: true,
                },
                {
                  name: "Admin",
                  price: 250,
                  icon: Crown,
                  desc: "Full power and control",
                  specs: [
                    "Unlimited RAM",
                    "80GB Storage",
                    "4 vCPU",
                    "Unlimited Slots",
                    "Full DDoS Protection",
                    "24/7 Support",
                  ],
                  highlight: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.12 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <div
                    className={`p-4 sm:p-5 rounded-xl border bg-black/40 backdrop-blur-sm transition-all h-full relative overflow-hidden flex flex-col text-left ${plan.highlight ? "border-primary/50 shadow-[0_0_20px_rgba(var(--primary)/0.12)]" : "border-primary/20 hover:border-primary/40"}`}
                  >
                    {plan.highlight && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                    )}
                    {plan.highlight && (
                      <div className="absolute top-2 right-2 bg-primary/20 text-primary text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full border border-primary/30">
                        POPULAR
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg border border-primary/10 group-hover:scale-110 transition-transform duration-300">
                        <plan.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-display font-bold text-white">
                          {plan.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono">
                          {plan.desc}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl sm:text-3xl font-display font-bold text-primary">
                        {formatCurrency(
                          convertFromKES(plan.price, userCurrency),
                          userCurrency,
                        )}
                      </span>
                      <span className="text-xs text-gray-500 font-mono ml-1">
                        /server
                      </span>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      {plan.specs.map((spec) => (
                        <div key={spec} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-mono text-gray-400">
                            {spec}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link to="/register" className="mt-4">
                      <motion.button
                        className={`w-full py-2.5 rounded-lg font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${plan.highlight ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30" : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/30"}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Get Started
                        <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="p-4 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all text-center"
              >
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1 font-mono">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-16 max-w-6xl mx-auto"
          >
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <div className="relative overflow-hidden rounded-lg">
                <div className="w-full h-48 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/5 border border-primary/20 mb-4"
                      animate={{
                        boxShadow: [
                          "0 0 10px hsl(120 100% 50% / 0.2)",
                          "0 0 20px hsl(120 100% 50% / 0.3)",
                          "0 0 10px hsl(120 100% 50% / 0.2)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Zap className="h-8 w-8 text-primary/90" />
                    </motion.div>
                    <p className="text-gray-500 font-mono text-sm">
                      WolfHost Control Panel
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="py-20 bg-background/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-white">
              Enterprise-Grade Infrastructure
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Built with cutting-edge technology for maximum performance and
              reliability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all h-full">
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-lg ${feature.iconBg} border border-primary/10 mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary/90 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-primary/80 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-sm font-mono">Learn more</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="py-20 bg-gradient-to-b from-background/50 to-background relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
            <h3 className="text-2xl sm:text-3xl font-display font-bold mb-6 text-white">
              Ready to Deploy Your Infrastructure?
            </h3>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of developers and businesses who trust WolfHost for
              their hosting needs.
            </p>
            <Link to="/register">
              <motion.button
                className="px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all duration-200 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-black/40 border-t border-primary/10 pt-16 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <motion.div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/5 border border-primary/20"
                  animate={{
                    boxShadow: [
                      "0 0 10px hsl(120 100% 50% / 0.2)",
                      "0 0 20px hsl(120 100% 50% / 0.3)",
                      "0 0 10px hsl(120 100% 50% / 0.2)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Zap className="h-6 w-6 text-primary/90" />
                </motion.div>
                <span className="ml-3 text-lg font-display font-bold tracking-widest">
                  <span className="text-primary">WOLF</span>
                  <span className="text-gray-400">HOST</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm font-mono leading-relaxed">
                Premium hosting infrastructure for the next generation. Deploy,
                scale, and manage with ease.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/login"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Register
                  </Link>
                </li>
                <li>
                  <a
                    href="https://panel.xwolf.space"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Control Panel
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                Connect With Us
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href={siteLinks.whatsappChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    WhatsApp Channel
                  </a>
                </li>
                <li>
                  <a
                    href={siteLinks.whatsappGroup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    <Users className="w-4 h-4 text-green-400" />
                    WhatsApp Group
                  </a>
                </li>
                {siteLinks.youtube && (
                  <li>
                    <a
                      href={siteLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono"
                    >
                      <Youtube className="w-4 h-4 text-red-400" />
                      YouTube
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href={siteLinks.supportPhone}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    <Phone className="w-4 h-4 text-green-400" />
                    {siteLinks.supportPhoneDisplay}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                Support
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href={siteLinks.supportPhone}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Contact Support
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
                  >
                    Status Page
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 font-mono text-sm">
              &copy; {new Date().getFullYear()} WolfHost Infrastructure. All
              systems operational.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={siteLinks.whatsappChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-all"
                title="WhatsApp Channel"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href={siteLinks.whatsappGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-all"
                title="WhatsApp Group"
              >
                <Users className="w-4 h-4" />
              </a>
              {siteLinks.youtube && (
                <a
                  href={siteLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              <a
                href={siteLinks.supportPhone}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-all"
                title="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
      <WolfChat />
    </div>
  );
}
