import { useState } from 'react';
import { Lightbulb, TrendingUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGetInvestorFeedback, useGetNitraFeedback } from '@workspace/api-client-react';
import type { FeedbackResponse, FeedbackPoint } from '@workspace/api-client-react';

export default function Feedback() {
  const investorFeedback = useGetInvestorFeedback();
  const nitraFeedback = useGetNitraFeedback();

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [revenueModel, setRevenueModel] = useState('');

  const [investorResult, setInvestorResult] = useState<FeedbackResponse | null>(null);
  const [nitraResult, setNitraResult] = useState<FeedbackResponse | null>(null);

  const handleInvestorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !description.trim()) return;

    investorFeedback.mutate(
      {
        data: {
          companyName: companyName.trim(),
          description: description.trim(),
          targetMarket: targetMarket.trim() || undefined,
          revenueModel: revenueModel.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => {
          setInvestorResult(data);
        },
      }
    );
  };

  const handleNitraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !description.trim()) return;

    nitraFeedback.mutate(
      {
        data: {
          companyName: companyName.trim(),
          description: description.trim(),
          targetMarket: targetMarket.trim() || undefined,
          revenueModel: revenueModel.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => {
          setNitraResult(data);
        },
      }
    );
  };

  const renderFeedbackResult = (result: FeedbackResponse | null) => {
    if (!result) return null;

    const getPointIcon = (point: FeedbackPoint) => {
      const type = point.type.toLowerCase();
      if (type.includes('strength') || type.includes('positive')) {
        return <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />;
      }
      if (type.includes('weakness') || type.includes('risk') || type.includes('concern')) {
        return <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
      }
      return <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />;
    };

    return (
      <div className="space-y-6 animate-slide-up">
        {/* Verdict */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Verdict</span>
              {result.score !== null && result.score !== undefined && (
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {result.score}/100
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold font-serif">{result.verdict}</p>
            {result.score !== null && result.score !== undefined && (
              <Progress value={result.score} className="h-2" />
            )}
            <p className="text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>

        {/* Feedback Points */}
        {result.points && result.points.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.points.map((point: FeedbackPoint, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    {getPointIcon(point)}
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{point.type}</p>
                      <p className="text-sm text-muted-foreground">{point.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif">
            AI Feedback
          </h1>
          <p className="text-lg text-muted-foreground">
            Get expert feedback on your startup idea from AI advisors
          </p>
        </div>

        <Tabs defaultValue="investor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="investor" data-testid="tab-investor">
              <TrendingUp className="h-4 w-4 mr-2" />
              Investor Mode
            </TabsTrigger>
            <TabsTrigger value="nitra" data-testid="tab-nitra">
              <Lightbulb className="h-4 w-4 mr-2" />
              Nitra Mode
            </TabsTrigger>
          </TabsList>

          {/* Investor Mode */}
          <TabsContent value="investor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Investor Feedback</CardTitle>
                <CardDescription>
                  Get brutally honest feedback from an AI investor's perspective
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvestorSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="investor-company">Company Name *</Label>
                    <Input
                      id="investor-company"
                      data-testid="input-investor-company"
                      type="text"
                      placeholder="Your startup name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investor-description">Description *</Label>
                    <Textarea
                      id="investor-description"
                      data-testid="input-investor-description"
                      placeholder="What does your company do? What problem are you solving?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investor-market">Target Market</Label>
                    <Input
                      id="investor-market"
                      data-testid="input-investor-market"
                      type="text"
                      placeholder="Who are your customers?"
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investor-revenue">Revenue Model</Label>
                    <Input
                      id="investor-revenue"
                      data-testid="input-investor-revenue"
                      type="text"
                      placeholder="How will you make money?"
                      value={revenueModel}
                      onChange={(e) => setRevenueModel(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-submit-investor"
                    className="w-full"
                    disabled={!companyName.trim() || !description.trim() || investorFeedback.isPending}
                  >
                    {investorFeedback.isPending ? 'Analyzing...' : 'Get Investor Feedback'}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {investorResult && renderFeedbackResult(investorResult)}
          </TabsContent>

          {/* Nitra Mode */}
          <TabsContent value="nitra" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nitra Feedback</CardTitle>
                <CardDescription>
                  Get constructive, supportive feedback to help you improve your idea
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNitraSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nitra-company">Company Name *</Label>
                    <Input
                      id="nitra-company"
                      data-testid="input-nitra-company"
                      type="text"
                      placeholder="Your startup name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nitra-description">Description *</Label>
                    <Textarea
                      id="nitra-description"
                      data-testid="input-nitra-description"
                      placeholder="What does your company do? What problem are you solving?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nitra-market">Target Market</Label>
                    <Input
                      id="nitra-market"
                      data-testid="input-nitra-market"
                      type="text"
                      placeholder="Who are your customers?"
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nitra-revenue">Revenue Model</Label>
                    <Input
                      id="nitra-revenue"
                      data-testid="input-nitra-revenue"
                      type="text"
                      placeholder="How will you make money?"
                      value={revenueModel}
                      onChange={(e) => setRevenueModel(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-submit-nitra"
                    className="w-full"
                    disabled={!companyName.trim() || !description.trim() || nitraFeedback.isPending}
                  >
                    {nitraFeedback.isPending ? 'Analyzing...' : 'Get Nitra Feedback'}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {nitraResult && renderFeedbackResult(nitraResult)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
