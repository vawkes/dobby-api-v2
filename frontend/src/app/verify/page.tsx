'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authAPI } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { FiMail, FiKey } from 'react-icons/fi';

// Define validation schema
const verifySchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    confirmationCode: z.string().min(1, 'Confirmation code is required'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get email from URL if available
    const emailParam = searchParams.get('email');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            email: emailParam || '',
        },
    });

    const onSubmit = async (data: VerifyFormValues) => {
        setIsLoading(true);
        try {
            await authAPI.confirmRegistration(data.email, data.confirmationCode);
            toast.success('Email verified successfully! You can now log in.');
            router.push('/login');
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('Verification failed. Please check your code and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Verify your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-700">
                    Please enter the verification code sent to your email
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            id="email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            icon={<FiMail className="h-5 w-5 text-gray-500" />}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <Input
                            id="confirmationCode"
                            label="Confirmation Code"
                            type="text"
                            icon={<FiKey className="h-5 w-5 text-gray-500" />}
                            error={errors.confirmationCode?.message}
                            {...register('confirmationCode')}
                        />

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                isLoading={isLoading}
                            >
                                Verify Account
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <div className="text-sm">
                            <Link
                                href="/login"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Already verified? Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 