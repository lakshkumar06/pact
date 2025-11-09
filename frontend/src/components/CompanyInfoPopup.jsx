import { useState } from 'react';

/**
 * Popup component to display company information with charts
 * Shows different data for vendor vs client roles
 */
export function CompanyInfoPopup({ isOpen, onClose, roleType, companyName }) {
  if (!isOpen) return null;

  // Dummy data - public company information
  const clientData = {
    companyName: companyName || 'Acme Corporation',
    companySize: '50-200 employees',
    industry: 'Technology',
    founded: '2015',
    location: 'San Francisco, CA',
    publicMetrics: {
      contractsCompleted: 47,
      avgContractValue: '$125K',
      totalValue: '$5.8M',
      activeContracts: 8
    },
    chartData: {
      contractsByYear: [
        { year: '2021', count: 8 },
        { year: '2022', count: 12 },
        { year: '2023', count: 15 },
        { year: '2024', count: 12 }
      ],
      contractSizes: [
        { range: '<$50K', count: 15 },
        { range: '$50K-$100K', count: 18 },
        { range: '$100K-$250K', count: 10 },
        { range: '>$250K', count: 4 }
      ]
    }
  };

  const vendorData = {
    companyName: companyName || 'TechServices Inc',
    companySize: '25-100 employees',
    industry: 'Software Development',
    founded: '2018',
    location: 'Austin, TX',
    publicMetrics: {
      contractsCompleted: 62,
      avgContractValue: '$95K',
      totalValue: '$5.9M',
      activeContracts: 12
    },
    chartData: {
      contractsByYear: [
        { year: '2021', count: 10 },
        { year: '2022', count: 14 },
        { year: '2023', count: 20 },
        { year: '2024', count: 18 }
      ],
      contractSizes: [
        { range: '<$50K', count: 22 },
        { range: '$50K-$100K', count: 25 },
        { range: '$100K-$250K', count: 12 },
        { range: '>$250K', count: 3 }
      ]
    }
  };

  const data = roleType === 'client' ? clientData : vendorData;
  const maxContracts = Math.max(...data.chartData.contractsByYear.map(d => d.count));
  const maxSizeCount = Math.max(...data.chartData.contractSizes.map(d => d.count));

  // Simple bar chart component
  const BarChart = ({ data, maxValue, height = 120 }) => {
    const svgWidth = 400;
    const padding = 40;
    const chartWidth = svgWidth - (padding * 2);
    const barSpacing = chartWidth / data.length;
    const barWidth = barSpacing * 0.7;
    const barGap = barSpacing * 0.3;
    const chartHeight = height - 30;
    
    return (
      <div className="relative w-full">
        <svg 
          viewBox={`0 0 ${svgWidth} ${height}`} 
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const yPos = 20 + (chartHeight * ratio);
            return (
              <line
                key={i}
                x1={padding}
                y1={yPos}
                x2={svgWidth - padding}
                y2={yPos}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.count / maxValue) * chartHeight * 0.85;
            const x = padding + (index * barSpacing) + (barGap / 2);
            const y = 20 + chartHeight - barHeight;
            const textX = x + (barWidth / 2);
            const textY = y - 5;
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={roleType === 'client' ? '#14b8a6' : '#0ea5e9'}
                  rx="4"
                  className="hover:opacity-80 transition-opacity"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {item.count}
                </text>
              </g>
            );
          })}
        </svg>
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-2">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-gray-500 flex-1 text-center">
              {item.year || item.range}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-[#89898900] flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${roleType === 'client' ? 'bg-teal-400' : 'bg-blue-600'} text-white p-6 rounded-t-2xl`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-medium mb-1">{data.companyName}</h2>
              <p className="text-teal-100 text-sm capitalize">{roleType} Profile</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Company Size</p>
              <p className="text-lg font-medium text-gray-900">{data.companySize}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Industry</p>
              <p className="text-lg font-medium text-gray-900">{data.industry}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Founded</p>
              <p className="text-lg font-medium text-gray-900">{data.founded}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Location</p>
              <p className="text-lg font-medium text-gray-900">{data.location}</p>
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Public Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-4 hover:border-teal-300 transition-colors">
                <p className="text-xs text-gray-500 mb-1">Contracts Completed</p>
                <p className="text-2xl font-medium text-gray-900">{data.publicMetrics.contractsCompleted}</p>
              </div>
        
              <div className="border border-gray-200 rounded-xl p-4 hover:border-teal-300 transition-colors">
                <p className="text-xs text-gray-500 mb-1">Avg Contract Value</p>
                <p className="text-2xl font-medium text-gray-900">{data.publicMetrics.avgContractValue}</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 hover:border-teal-300 transition-colors">
                <p className="text-xs text-gray-500 mb-1">Total Value</p>
                <p className="text-2xl font-medium text-gray-900">{data.publicMetrics.totalValue}</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contracts by Year</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <BarChart data={data.chartData.contractsByYear} maxValue={maxContracts} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Size Distribution</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <BarChart data={data.chartData.contractSizes} maxValue={maxSizeCount} />
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This information is based on publicly available on-chain data. 
              Detailed financial information and private company data are not disclosed for privacy reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

