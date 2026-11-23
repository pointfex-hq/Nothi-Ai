export interface ContactFormData {
  name: string;
  organization: string;
  email: string;
  plan: 'free' | 'basic' | 'plus' | 'pro' | 'demo';
  message?: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  message: string;
}

/**
 * Submits access requests or sales inquiries to Nothi AI.
 * Simulates backend response. No payment gateway integration or fake checkout.
 */
export async function submitContact(data: ContactFormData): Promise<ContactSubmissionResult> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Please enter a valid work email address.');
  }

  if (!data.name.trim() || !data.organization.trim()) {
    throw new Error('Name and organization are required fields.');
  }

  // Simulate network latency (400ms)
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    success: true,
    message: `Thank you, ${data.name}. Our legal team has received your request for the ${data.plan.toUpperCase()} tier and will contact you at ${data.email} within one business day.`,
  };
}
