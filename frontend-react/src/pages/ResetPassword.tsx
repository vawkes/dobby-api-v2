import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiKey } from 'react-icons/fi';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Define validation schema
const resetPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    confirmationCode: z.string().min(6, 'Confirmation code must be at least 6 characters'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from location state if available
    const emailFromState = location.state?.email || '';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            email: emailFromState,
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        setIsSubmitting(true);
        try {
            await authAPI.resetPassword(data.email, data.confirmationCode, data.newPassword);
            toast.success('Password has been reset successfully!');
            navigate('/login');
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error('Failed to reset password. Please check your code and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter the code sent to your email and create a new password
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
                            icon={<FiMail className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.email?.message}
                            disabled={!!emailFromState}
                            {...register('email')}
                        />

                        <Input
                            id="confirmationCode"
                            label="Confirmation Code"
                            type="text"
                            autoComplete="one-time-code"
                            icon={<FiKey className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.confirmationCode?.message}
                            {...register('confirmationCode')}
                        />

                        <Input
                            id="newPassword"
                            label="New Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.newPassword?.message}
                            {...register('newPassword')}
                        />

                        <Input
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                loading={isSubmitting}
                            >
                                Reset Password
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <div className="text-sm">
                            <Link
                                to="/forgot-password"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Need a new code?
                            </Link>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Remember your password?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage; 