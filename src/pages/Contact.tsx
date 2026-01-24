import { useState } from 'react';
import { Send, Mail, MessageSquare, User, MessageCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const Contact = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discordId: '',
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

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-discord', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: t('contact.success'),
        description: t('contact.success_desc'),
      });

      setFormData({ name: '', email: '', discordId: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: t('contact.error'),
        description: t('contact.error_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <HeroSection
        title={t('contact.title')}
        subtitle={t('contact.subtitle')}
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
                  {t('contact.name')}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('contact.name_placeholder')}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t('contact.email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('contact.email_placeholder')}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Discord ID */}
              <div className="space-y-2">
                <Label htmlFor="discordId" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  {t('contact.discord_id')}
                </Label>
                <Input
                  id="discordId"
                  name="discordId"
                  value={formData.discordId}
                  onChange={handleChange}
                  placeholder={t('contact.discord_placeholder')}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  {t('contact.subject')}
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder={t('contact.subject_placeholder')}
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">{t('contact.message')}</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('contact.message_placeholder')}
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
                  t('contact.sending')
                ) : (
                  <>
                    {t('contact.send')}
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
