// app/dashboard/page.tsx
import { ArrowRight, PieChart, HeartPulse, Lightbulb, AlertTriangle, TrendingUp, Wallet, BarChart2 } from "lucide-react";

export default function AnalyticsDashboard() {
  const cards = [
    {
      title: "Cash Flow",
      description: "Track income and expenses over time",
      icon: <TrendingUp className="w-6 h-6 text-blue-500" />,
      link: "/cash-flow",
    },
    {
      title: "Financial Health",
      description: "Key indicators of your business health",
      icon: <HeartPulse className="w-6 h-6 text-green-500" />,
      link: "/financial-health",
    },
    {
      title: "Recommendations",
      description: "Personalized financial advice",
      icon: <Lightbulb className="w-6 h-6 text-yellow-500" />,
      link: "/recommendations",
    },
    {
      title: "Predictions",
      description: "Forecast future trends",
      icon: <PieChart className="w-6 h-6 text-purple-500" />,
      link: "/predictions",
    },
    {
      title: "Vendor Analysis",
      description: "Evaluate supplier performance",
      icon: <BarChart2 className="w-6 h-6 text-orange-500" />,
      link: "/vendor-analysis",
    },
    {
      title: "Alerts",
      description: "Critical notifications",
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      link: "/alerts",
    },
    {
      title: "Financial Optimization",
      description: "Maximize efficiency",
      icon: <Wallet className="w-6 h-6 text-teal-500" />,
      link: "/optimization",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Insights to drive your financial decisions</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <a
            key={index}
            href={card.link}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 hover:border-blue-100"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-50 rounded-lg">{card.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{card.description}</p>
              </div>
              <ArrowRight className="ml-auto w-5 h-5 text-gray-400" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
