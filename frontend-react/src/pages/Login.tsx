import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Define validation schema
const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsSubmitting(true);
        try {
            await login(data);
            navigate('/dashboard'); // Redirect to dashboard after successful login
        } catch (error) {
            console.error('Login error:', error);
            // Error handling is done in the auth context
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Sign in to your account
                </h2>
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
                            {...register('email')}
                        />

                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.password?.message}
                            {...register('password')}
                        />

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <Link
                                    to="/forgot-password"
                                    className="font-medium text-blue-700 hover:text-blue-800"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                isLoading={isSubmitting}
                            >
                                Sign in
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-700">
                                    Or
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link
                                to="/register"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Create a new account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage; 