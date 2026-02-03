package com.basis.bbj.intellij;

import com.intellij.lang.Commenter;
import org.jetbrains.annotations.Nullable;

public class BbjCommenter implements Commenter {
    @Nullable
    @Override
    public String getLineCommentPrefix() {
        return "REM ";
    }

    @Nullable
    @Override
    public String getBlockCommentPrefix() {
        return null;
    }

    @Nullable
    @Override
    public String getBlockCommentSuffix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentPrefix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentSuffix() {
        return null;
    }
}
