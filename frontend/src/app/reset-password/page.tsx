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
import { FiMail, FiKey, FiLock } from 'react-icons/fi';

// Define validation schema
const resetPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    confirmationCode: z.string().min(1, 'Confirmation code is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get email from URL if available
    const emailParam = searchParams.get('email');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            email: emailParam || '',
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        setIsLoading(true);
        try {
            await authAPI.resetPassword(
                data.email,
                data.confirmationCode,
                data.newPassword
            );
            toast.success('Password reset successful! You can now log in with your new password.');
            router.push('/login');
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error('Password reset failed. Please check your details and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-700">
                    Enter the code from your email and create a new password
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

                        <Input
                            id="newPassword"
                            label="New Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" />}
                            error={errors.newPassword?.message}
                            {...register('newPassword')}
                        />

                        <Input
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                isLoading={isLoading}
                            >
                                Reset Password
                            </Button>
                        </div>
                    </form>

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