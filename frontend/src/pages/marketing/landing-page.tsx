const Welcome: React.FC = () => {
  return (
    <>
      <div className="bg-[#18181B] font-sans text-white">
        {/* Header */}
        <header className="fixed flex w-screen items-center justify-between border-b border-[#3a3a3a] bg-[#18181B] p-6">
          <a href="/">Bulk Logistics</a>
          <nav className="hidden gap-6 text-sm md:flex">
            <a href="#">Product</a>
            <a href="#">Company</a>
            <a href="#">Pricing</a>
            <a href="#">Blog</a>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <a href="/login">Login</a>
            <a
              href="/register"
              className="rounded bg-[#9A6CC3] px-4 py-2 text-white"
            >
              Try Free
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="h-screen bg-[#18181B] px-6 py-20 text-center">
          <h1 className="mt-14 mb-6 text-4xl leading-tight font-bold text-white md:text-5xl lg:mt-32 lg:text-7xl">
            Reclaim Your Time. <br /> Empower Your Business.
          </h1>
          <p className="mx-auto mb-6 max-w-xl text-base text-[#cdcdcd] lg:text-xl">
            Effortlessly integrate inventory, asset tracking, quoting, and
            invoicing for complete business clarity.
          </p>
          <form className="flex justify-center gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-64 rounded border border-[#3a3a3a] px-4 py-2 focus:ring-[#9A6CC3]"
            />
            <button className="rounded bg-[#9A6CC3] px-4 py-2 text-white">
              Try Free
            </button>
          </form>
        </section>

        {/* Benefits Section */}
        <section className="h-screen bg-[#9A6CC3] px-6 py-16 text-[#18181B]">
          <h2 className="mb-10 text-center text-4xl font-bold">
            Here’s how Zaventory can benefit your business
          </h2>
          <div className="mx-auto max-w-5xl justify-center gap-6 md:flex-row">
            <div className="mb-10 rounded bg-white p-6 text-black">
              <h3 className="mb-2 font-semibold">Engage customers</h3>
              <p>
                Talk to your customers across messaging, email, social media,
                and more.
              </p>
            </div>
            <div className="mb-10 rounded bg-white p-6 text-black">
              <h3 className="mb-2 font-semibold">Support at scale</h3>
              <p>
                Manage your support requests and grow your customer base
                efficiently.
              </p>
            </div>
            <div className="mb-10 rounded bg-white p-6 text-black">
              <h3 className="mb-2 font-semibold">Automate workflows</h3>
              <p>
                Boost team productivity by automating repetitive tasks and
                support tickets.
              </p>
            </div>
            <div className="mb-10 rounded bg-white p-6 text-black">
              <h3 className="mb-2 font-semibold">Engage customers</h3>
              <p>
                Talk to your customers across messaging, email, social media,
                and more.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">
                Increase company revenue up to 65%
              </h2>
              <ul className="list-inside list-disc space-y-2 text-gray-700">
                <li>Manage all customer interactions in one place</li>
                <li>Track conversations and leads effortlessly</li>
                <li>Productivity and efficiency that scales</li>
                <li>Powerful integrations and automations</li>
              </ul>
            </div>
            <div className="flex h-64 items-center justify-center rounded bg-gray-100">
              <p>Image/Graph Placeholder</p>
            </div>
          </div>

          <div className="mt-20 grid items-center gap-12 md:grid-cols-2">
            <div className="flex h-64 items-center justify-center rounded bg-gray-100">
              <p>Mobile UI Screenshot</p>
            </div>
            <div>
              <h2 className="mb-4 text-3xl font-bold">Marketing Automation</h2>
              <ul className="list-inside list-disc space-y-2 text-gray-700">
                <li>Set up email campaigns effortlessly</li>
                <li>Convert leads with smart workflows</li>
                <li>Understand what works with analytics</li>
                <li>Seamless integration with CRM tools</li>
              </ul>
            </div>
          </div>

          <div className="mt-20 grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">Help Desk Software</h2>
              <ul className="list-inside list-disc space-y-2 text-gray-700">
                <li>Streamlined support system</li>
                <li>Custom ticket pipelines</li>
                <li>Multi-channel support</li>
                <li>24/7 live chat & knowledge base</li>
              </ul>
            </div>
            <div className="flex h-64 items-center justify-center rounded bg-gray-100">
              <p>Help Desk UI Preview</p>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="bg-gray-50 py-16 text-center">
          <h2 className="mb-6 text-2xl font-bold">Over 300+ integrations</h2>
          <p className="mb-8">
            Plug Zaventory into the tools your team already uses.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {["HubSpot", "Zoom", "Zendesk", "Intercom", "Slack", "Asana"].map(
              (app) => (
                <div key={app} className="rounded bg-white p-4 shadow">
                  {app}
                </div>
              ),
            )}
          </div>
        </section>

        {/* Blog */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-2xl font-bold">What’s new at Zaventory?</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="mb-4 h-40 bg-gray-100"></div>
              <h3 className="font-semibold">
                How To Deliver a Successful Product Launch
              </h3>
              <p className="text-sm text-gray-500">May 25, 2025 — 6 min read</p>
            </div>
            <div>
              <div className="mb-4 h-40 bg-gray-100"></div>
              <h3 className="font-semibold">
                What Makes an Authentic Employee Profile?
              </h3>
              <p className="text-sm text-gray-500">May 25, 2025 — 5 min read</p>
            </div>
          </div>
        </section>

        {/* Testimonials and Results */}
        <section className="bg-white px-6 py-20 text-center">
          <h2 className="mb-6 text-2xl font-bold">
            Real-life results and revenue
          </h2>
          <p className="mb-6 text-gray-700">
            $2.5M: Startup X used Zaventory and saw revenue jump in 3 months.
          </p>
          <p className="mb-6 text-gray-700">
            43%: Service team efficiency boost from using our help desk.
          </p>

          <h3 className="mt-12 mb-4 text-xl font-semibold">
            We love our Customers and They love us too
          </h3>
          <div className="mx-auto mt-6 flex max-w-4xl flex-col justify-center gap-10 text-left md:flex-row">
            {[
              "Best thing we’ve decided...",
              "Zaventory made change easier...",
              "Perfect for small businesses...",
            ].map((quote, i) => (
              <blockquote key={i} className="rounded bg-gray-100 p-4">
                <p className="mb-2 italic">“{quote}”</p>
                <p className="text-sm font-semibold">– Customer {i + 1}</p>
              </blockquote>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#9A6CC3] py-16 text-center text-white">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to supercharge your business?
          </h2>
          <p className="mb-6">
            Start your free trial today and join 10,000+ customers using
            Zaventory.
          </p>
          <a
            href="/register"
            className="rounded bg-white px-6 py-3 font-semibold text-[#9A6CC3]"
          >
            Try Free
          </a>
        </section>

        {/* Footer */}
        <footer className="bg-[#18181B] px-6 py-12 text-white">
          <div className="flex flex-col justify-between text-sm md:flex-row">
            <div className="text-[#878787]">
              <div className="mb-4 text-2xl font-bold">Bulk Logistics</div>
              <p>© {new Date().getFullYear()} Zaventory (Pty) Ltd.</p>
              <small>All rights reserved</small>
            </div>
            <div className="mt-6 flex gap-12 md:mt-0">
              <div>
                <h4 className="mb-2 font-semibold">Company</h4>
                <ul>
                  <li>
                    <a href="#">About</a>
                  </li>
                  <li>
                    <a href="#">Blog</a>
                  </li>
                  <li>
                    <a href="#">Careers</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">Support</h4>
                <ul>
                  <li>
                    <a href="#">Help Center</a>
                  </li>
                  <li>
                    <a href="#">Contact</a>
                  </li>
                  <li>
                    <a href="#">API Docs</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">Legal</h4>
                <ul>
                  <li>
                    <a href="#">Privacy</a>
                  </li>
                  <li>
                    <a href="#">Terms</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Welcome;
