import { Component, type ErrorInfo, type ReactNode } from "react";
import "./PageErrorBoundary.css";

type Props = {
    children: ReactNode;
};

type State = {
    hasError: boolean;
};

export default class PageErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Sayfa yüklenirken beklenmeyen hata oluştu:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <section className="page-state page-state--error" role="alert">
                    <span className="page-state__icon">!</span>
                    <h2>Sayfa görüntülenemedi</h2>
                    <p>Diğer modüller çalışmaya devam ediyor. Sayfayı yeniden deneyebilirsiniz.</p>
                    <button type="button" onClick={() => this.setState({ hasError: false })}>
                        Yeniden dene
                    </button>
                </section>
            );
        }

        return this.props.children;
    }
}
