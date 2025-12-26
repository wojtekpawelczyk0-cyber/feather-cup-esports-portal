import { useState } from 'react';
import { Send, Mail, MessageSquare, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: 'Wiadomość wysłana!',
      description: 'Odpowiemy najszybciej jak to możliwe.',
    });

    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <Layout>
      <HeroSection
        title="Kontakt"
        subtitle="Masz pytania? Skontaktuj się z nami, a odpowiemy najszybciej jak to możliwe"
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-2xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="glass-card p-8 md:p-10">
            <div className="grid gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Imię i nazwisko
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Adres e-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jan@example.com"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Temat
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="W czym możemy pomóc?"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Wiadomość</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Opisz szczegółowo swoje pytanie lub problem..."
                  rows={6}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Wysyłanie...'
                ) : (
                  <>
                    Wyślij wiadomość
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
