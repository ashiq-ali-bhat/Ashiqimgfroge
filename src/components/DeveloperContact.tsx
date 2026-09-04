import React, { useState } from 'react';
import { 
  Github, 
  Linkedin, 
  Send, 
  Mail, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const DeveloperContact: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: 'General Inquiry / Feedback',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.message.trim()) {
      setErrorMessage('Please write your message.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Send directly to Web3Forms API
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: '5e295706-fa9a-40b3-a3a7-3d10c0196592',
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.status === 200 && (data.success || data.message === 'Success')) {
        setIsSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: 'General Inquiry / Feedback',
          message: '',
        });
      } else {
        setErrorMessage(data.message || 'Unable to submit via Web3Forms. Please try again.');
      }
    } catch {
      setErrorMessage('Network connection error. You can also use the email link below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mailtoUrl = `mailto:fhgcffggff99@gmail.com?subject=${encodeURIComponent(
    formData.subject || 'Media Converter Tool Contact'
  )}&body=${encodeURIComponent(
    `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
  )}`;

  return (
    <section id="developer-contact-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Developer Information & Social Links */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Developer Information</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Connect with the Developer
              </h2>

              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Have a question, feedback, feature suggestion, or custom media tool requirement? Reach out directly via social channels or drop a message using the contact form.
              </p>

              {/* Developer Links */}
              <div className="mt-6 space-y-3">
                {/* GitHub */}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 hover:bg-slate-800/80 transition group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 group-hover:scale-110 group-hover:border-pink-500/30 transition">
                      <Github className="w-5 h-5 text-slate-200 group-hover:text-pink-300 transition" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-pink-300 transition">
                        GitHub
                      </div>
                      <div className="text-xs text-slate-400">View source code & repositories</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition" />
                </a>

                {/* Telegram */}
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/80 transition group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 group-hover:scale-110 group-hover:border-cyan-500/30 transition">
                      <Send className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">
                        Telegram
                      </div>
                      <div className="text-xs text-slate-400">Direct instant messaging</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/80 transition group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 group-hover:scale-110 group-hover:border-blue-500/30 transition">
                      <Linkedin className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition">
                        LinkedIn
                      </div>
                      <div className="text-xs text-slate-400">Professional network & profile</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
                </a>
              </div>
            </div>

            {/* Privacy & Direct Mail Note */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
              <Mail className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-300 font-medium">Direct Email Contact: </span>
                <a
                  href="mailto:fhgcffggff99@gmail.com"
                  className="text-pink-400 hover:underline break-all"
                >
                  fhgcffggff99@gmail.com
                </a>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Messages sent via the contact form or email client are directly delivered.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-7 bg-slate-950/60 p-6 sm:p-8 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-bold text-white">Send a Message</h3>
              </div>
              <span className="text-xs text-slate-500">Response within 24 hours</span>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-white">Message Sent Successfully!</h4>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Thank you for reaching out! Your message has been received and the developer will get back to you shortly.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="px-5 py-2.5 rounded-xl bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 transition shadow-md shadow-pink-500/20 cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form 
                action="https://api.web3forms.com/submit" 
                method="POST" 
                onSubmit={handleSubmit} 
                className="space-y-4"
              >
                <input 
                  type="hidden" 
                  name="access_key" 
                  value="5e295706-fa9a-40b3-a3a7-3d10c0196592" 
                />

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Your Name *</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Your Email *</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter Email"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-pink-500 transition cursor-pointer"
                  >
                    <option value="General Inquiry / Feedback">General Inquiry / Feedback</option>
                    <option value="Feature Suggestion">Feature Suggestion for Media Converter</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Custom Project Collaboration">Custom Project Collaboration</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Message *</label>
                    <span className="text-[10px] text-slate-500">{formData.message.length} characters</span>
                  </div>
                  <textarea
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Type your message, questions, or ideas here..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition resize-none"
                  />
                </div>

                {/* Buttons: Submit + Mailto fallback */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <a
                    href={mailtoUrl}
                    className="text-xs text-slate-400 hover:text-pink-300 transition flex items-center gap-1.5 underline decoration-slate-700 hover:decoration-pink-400"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in your Email App instead</span>
                  </a>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
