<template>
  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    <!-- Business Strategy -->
    <div class="service-card">
      <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">Business Strategy</h3>
      <p class="text-gray-600 mb-4">MBA-level strategic guidance for sustainable growth and market positioning.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• Market Research & Analysis</li>
        <li>• Financial Modeling</li>
        <li>• Product Management</li>
        <li>• Organizational Design</li>
      </ul>
    </div>

    <!-- Software Development -->
    <div class="service-card">
      <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">Software Development</h3>      <p class="text-gray-600 mb-4">Custom software solutions built with modern technologies and best practices.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• Web & Mobile Applications</li>
        <li>• Cloud Infrastructure</li>
        <li>• API Development</li>
        <li>• System Integration</li>
      </ul>
    </div>

    <!-- Data & Analytics -->
    <div class="service-card">
      <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">Data & Analytics</h3>
      <p class="text-gray-600 mb-4">Transform your data into actionable insights with advanced analytics and AI.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• Business Intelligence</li>
        <li>• AI/ML Integration</li>
        <li>• Data Visualization</li>
        <li>• Predictive Analytics</li>
      </ul>
    </div>

    <!-- Compliance & Security -->
    <div class="service-card">
      <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">Compliance & Security</h3>
      <p class="text-gray-600 mb-4">Navigate complex regulatory requirements with confidence and security.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• HIPAA Compliance</li>
        <li>• GDPR & Privacy</li>
        <li>• PCI DSS</li>
        <li>• Security Audits</li>
      </ul>
    </div>

    <!-- AI Development -->
    <div class="service-card">
      <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">AI Development</h3>
      <p class="text-gray-600 mb-4">Build custom AI solutions and agents tailored to your business needs.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• Custom AI Agents</li>
        <li>• LLM Integration</li>
        <li>• Process Automation</li>
        <li>• Chatbot Development</li>
      </ul>
    </div>

    <!-- Nonprofit Services -->
    <div class="service-card bg-secondary-50 border-secondary-200">
      <div class="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2">Nonprofit Support</h3>
      <p class="text-gray-600 mb-4">Special programs and reduced rates for qualifying nonprofit organizations.</p>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>• Grant Writing Support</li>
        <li>• Impact Measurement</li>
        <li>• Capacity Building</li>
        <li>• Pro Bono Services</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.service-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300;
}
</style>