// app/crm/leads/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  Save, 
  X,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface CRMOptions {
  territories: Array<{ name: string; territory_name: string }>;
  salesPersons: Array<{ name: string; sales_person_name: string }>;
  leadSources: Array<{ name: string; source_name: string }>;
}

export default function NewLeadPage() {
  const { push: toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [options, setOptions] = useState<CRMOptions | null>(null);
  
  const [formData, setFormData] = useState({
    lead_name: "",
    email_id: "",
    mobile_no: "",
    status: "Open",
    source: "",
    territory: "",
    contact_by: ""
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setOptionsLoading(true);
    try {
      const response = await fetch('/api/crm/options');
      if (response.ok) {
        const data = await response.json();
        setOptions(data.data.options);
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to load options"
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.lead_name) {
      toast({
        variant: "error",
        title: "Error",
        description: "Lead name is required"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create lead');
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: `Lead ${data.data.lead.name} created successfully`
      });

      router.push('/crm/leads');
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error",
        description: `Failed to create lead: ${(error as Error).message}`
      });
    } finally {
      setLoading(false);
    }
  };

  if (optionsLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/crm/leads')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Users className="w-8 h-8 mr-3 text-primary" />
              New Lead
            </h1>
            <p className="text-muted-foreground">Create a new lead</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details for this lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="lead_name">Lead Name *</Label>
                <Input
                  id="lead_name"
                  value={formData.lead_name}
                  onChange={(e) => handleInputChange('lead_name', e.target.value)}
                  placeholder="Full name or company name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email_id">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                      id="email_id"
                      type="email"
                      value={formData.email_id}
                      onChange={(e) => handleInputChange('email_id', e.target.value)}
                      placeholder="Email address"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mobile_no">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                      id="mobile_no"
                      type="tel"
                      value={formData.mobile_no}
                      onChange={(e) => handleInputChange('mobile_no', e.target.value)}
                      placeholder="Phone number"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Not Interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => handleInputChange('source', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {options?.leadSources.map(source => (
                        <SelectItem key={source.name} value={source.name}>
                          {source.source_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="territory">Territory</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Select
                      value={formData.territory}
                      onValueChange={(value) => handleInputChange('territory', value)}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select Territory" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.territories.map(territory => (
                          <SelectItem key={territory.name} value={territory.name}>
                            {territory.territory_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="contact_by">Contact By</Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Select
                      value={formData.contact_by}
                      onValueChange={(value) => handleInputChange('contact_by', value)}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select Sales Person" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.salesPersons.map(person => (
                          <SelectItem key={person.name} value={person.name}>
                            {person.sales_person_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div>
          {/* Summary Card */}
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Lead Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span>{formData.lead_name || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span>{formData.email_id || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span>{formData.mobile_no || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant="outline">{formData.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span>{formData.source || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Territory</span>
                  <span>{formData.territory || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact By</span>
                  <span>{formData.contact_by || "Not specified"}</span>
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={loading || !formData.lead_name}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Lead'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}