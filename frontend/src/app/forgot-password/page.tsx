'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authAPI } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FiMail } from 'react-icons/fi';

// Define validation schema
const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const emailValue = watch('email');

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);
        try {
            await authAPI.forgotPassword(data.email);
            setIsCodeSent(true);
            toast.success('Password reset code sent to your email.');
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.error('Failed to send reset code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const goToResetPassword = () => {
        router.push(`/reset-password?email=${encodeURIComponent(emailValue)}`);
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Forgot your password?
                </h2>
                <p className="mt-2 text-center text-sm text-gray-700">
                    Enter your email address and we'll send you a code to reset your password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {!isCodeSent ? (
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

                            <div>
                                <Button
                                    type="submit"
                                    fullWidth
                                    isLoading={isLoading}
                                >
                                    Send Reset Code
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 p-4 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800">Reset code sent</h3>
                                        <div className="mt-2 text-sm text-green-700">
                                            <p>
                                                We've sent a password reset code to {emailValue}. Please check your email.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={goToResetPassword}
                                fullWidth
                            >
                                Continue to Reset Password
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <div className="text-sm">
                            <Link
                                href="/login"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Return to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 